import { useState, useEffect, useCallback, useRef } from 'react'
import { db, ref, set, onValue, remove, get, update, runTransaction } from './firebase'
import { pickFreeCode, expiredRoomCodes, findFreeSlot } from './roomCodes'

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

// 1시간 지난 방을 지우고, 아직 살아있는 방 코드 목록을 돌려준다.
async function cleanOldRooms(gameType) {
  try {
    const roomsRef = ref(db, `rooms/${gameType}`)
    const snap = await get(roomsRef)
    if (!snap.exists()) return []
    const rooms = snap.val()
    const expired = expiredRoomCodes(rooms, Date.now())
    for (const code of expired) {
      await remove(ref(db, `rooms/${gameType}/${code}`))
    }
    return Object.keys(rooms).filter(c => !expired.includes(c))
  } catch (e) {
    return []
  }
}

export function useMultiGameRoom(gameType) {
  const [roomCode, setRoomCode] = useState(null)
  const [mySlot, setMySlot] = useState(null) // 0..5
  const [room, setRoom] = useState(null) // {host, maxPlayers, players, status, state}
  const [error, setError] = useState('')
  const roomUnsubRef = useRef(null)

  // 방 만들기
  const createRoom = useCallback(async (maxPlayers, myName, initialState = null) => {
    const takenCodes = await cleanOldRooms(gameType)
    const code = pickFreeCode(takenCodes)
    if (!code) {
      setError('지금은 방이 다 찼어요. 잠시 뒤에 다시 만들어 주세요')
      return null
    }
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
    const slot = findFreeSlot(data.players, data.maxPlayers || 6)
    if (slot < 0) {
      setError('방이 가득 찼어요')
      return false
    }
    // 슬롯은 트랜잭션으로 선점한다. 그냥 set하면 동시에 들어온 두 사람이
    // 같은 슬롯을 잡아 한 명이 조용히 덮어써진다.
    const claim = await runTransaction(
      ref(db, `rooms/${gameType}/${code}/players/${slot}`),
      (current) => {
        if (current) return undefined // 이미 누가 앉았음 → 트랜잭션 취소
        return { name: myName || `플레이어${slot + 1}`, joinedAt: Date.now() }
      }
    )
    if (!claim.committed) {
      setError('자리를 놓쳤어요. 다시 참가해 주세요')
      return false
    }

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
