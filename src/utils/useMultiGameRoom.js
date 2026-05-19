import { useState, useEffect, useCallback, useRef } from 'react'
import { db, ref, set, onValue, remove, get, update } from './firebase'

// 다인용 (2~6인) 게임 룸. 슬롯 기반.
// Firebase 구조:
//   rooms/{gameType}/{code}/
//     host: slotId (보통 0)
//     maxPlayers: number
//     players: { [slotId]: { name, joinedAt } }   // slotId = 0..5
//     status: 'lobby' | 'playing' | 'ended'
//     state: 게임 상태
//     createdAt
//
// player ID(slotId)는 0..maxPlayers-1.
// 호스트는 slot 0. 게스트는 빈 슬롯을 찾아 할당.

function generateCode() {
  return String(Math.floor(10 + Math.random() * 90))
}

async function cleanOldRooms(gameType) {
  try {
    const roomsRef = ref(db, `rooms/${gameType}`)
    const snap = await get(roomsRef)
    if (!snap.exists()) return
    const rooms = snap.val()
    const now = Date.now()
    const ONE_HOUR = 60 * 60 * 1000
    for (const code of Object.keys(rooms)) {
      if (rooms[code].createdAt && now - rooms[code].createdAt > ONE_HOUR) {
        await remove(ref(db, `rooms/${gameType}/${code}`))
      }
    }
  } catch (e) {}
}

export function useMultiGameRoom(gameType) {
  const [roomCode, setRoomCode] = useState(null)
  const [mySlot, setMySlot] = useState(null) // 0..5
  const [room, setRoom] = useState(null) // {host, maxPlayers, players, status, state}
  const [error, setError] = useState('')
  const roomUnsubRef = useRef(null)

  // 방 만들기
  const createRoom = useCallback(async (maxPlayers, myName, initialState = null) => {
    await cleanOldRooms(gameType)
    const code = generateCode()
    const roomRef = ref(db, `rooms/${gameType}/${code}`)
    await set(roomRef, {
      host: 0,
      maxPlayers,
      players: { 0: { name: myName || '호스트', joinedAt: Date.now() } },
      status: 'lobby',
      state: initialState,
      createdAt: Date.now(),
    })
    setRoomCode(code)
    setMySlot(0)
    setError('')

    const unsub = onValue(roomRef, (snap) => {
      if (snap.exists()) setRoom(snap.val())
    })
    roomUnsubRef.current = unsub

    return code
  }, [gameType])

  // 방 참가
  const joinRoom = useCallback(async (code, myName) => {
    const roomRef = ref(db, `rooms/${gameType}/${code}`)
    const snap = await get(roomRef)
    if (!snap.exists()) {
      setError('방을 찾을 수 없어요')
      return false
    }
    const data = snap.val()
    if (data.status !== 'lobby') {
      setError('이미 시작된 방이에요')
      return false
    }
    const players = data.players || {}
    const max = data.maxPlayers || 6
    // 빈 슬롯 찾기
    let slot = -1
    for (let i = 0; i < max; i++) {
      if (!players[i]) { slot = i; break }
    }
    if (slot < 0) {
      setError('방이 가득 찼어요')
      return false
    }
    await set(ref(db, `rooms/${gameType}/${code}/players/${slot}`), {
      name: myName || `플레이어${slot + 1}`,
      joinedAt: Date.now(),
    })

    setRoomCode(code)
    setMySlot(slot)
    setError('')

    const unsub = onValue(roomRef, (snap2) => {
      if (snap2.exists()) setRoom(snap2.val())
      else {
        // 방이 사라짐 (호스트가 닫음)
        setRoom(null)
        setRoomCode(null)
        setMySlot(null)
      }
    })
    roomUnsubRef.current = unsub

    return true
  }, [gameType])

  // 게임 시작 (호스트만)
  const startGame = useCallback(async (initialState) => {
    if (!roomCode) return
    await update(ref(db, `rooms/${gameType}/${roomCode}`), {
      status: 'playing',
      state: initialState,
    })
  }, [roomCode, gameType])

  // 상태 업데이트
  const updateState = useCallback(async (newState) => {
    if (!roomCode) return
    await set(ref(db, `rooms/${gameType}/${roomCode}/state`), newState)
  }, [roomCode, gameType])

  // 방 닫기/나가기
  const leaveRoom = useCallback(async () => {
    if (roomUnsubRef.current) { roomUnsubRef.current(); roomUnsubRef.current = null }
    if (roomCode != null && mySlot != null) {
      try {
        if (mySlot === 0) {
          // 호스트가 나가면 방 폭파
          await remove(ref(db, `rooms/${gameType}/${roomCode}`))
        } else {
          await remove(ref(db, `rooms/${gameType}/${roomCode}/players/${mySlot}`))
        }
      } catch (e) {}
    }
    setRoomCode(null)
    setMySlot(null)
    setRoom(null)
    setError('')
  }, [roomCode, mySlot, gameType])

  useEffect(() => () => {
    if (roomUnsubRef.current) roomUnsubRef.current()
  }, [])

  return {
    roomCode, mySlot, room, error,
    isHost: mySlot === 0,
    createRoom, joinRoom, startGame, updateState, leaveRoom, setError,
  }
}
