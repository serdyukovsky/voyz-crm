"use client"

import { useState, useEffect, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getOrCreateThread,
  getUserThreads,
  getThread,
  sendMessage,
  type ChatThread,
  type ChatMessage,
  type CreateThreadDto,
  type SendMessageDto,
} from '@/lib/api/chat'
import { io, Socket } from 'socket.io-client'
import { getWsUrl } from '@/lib/config'

const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null

export function useChat() {
  const queryClient = useQueryClient()
  const [socket, setSocket] = useState<Socket | null>(null)

  // Initialize socket connection
  useEffect(() => {
    if (!token) return

    // Get WebSocket URL from config
    const wsUrl = getWsUrl()
    const newSocket = io(wsUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
    })

    newSocket.on('connect', () => {
      console.log('Chat socket connected')
    })

    newSocket.on('chat.message', (data: { threadId: string; message: ChatMessage }) => {
      // Invalidate thread queries to refetch
      queryClient.invalidateQueries({ queryKey: ['chat', 'thread', data.threadId] })
      queryClient.invalidateQueries({ queryKey: ['chat', 'threads'] })
    })

    newSocket.on('disconnect', () => {
      console.log('Chat socket disconnected')
    })

    setSocket(newSocket)

    return () => {
      newSocket.close()
    }
  }, [token, queryClient])

  // Subscribe to thread updates
  const subscribeToThread = useCallback(
    (threadId: string) => {
      if (socket) {
        socket.emit('subscribe:thread', { threadId })
      }
    },
    [socket],
  )

  // Unsubscribe from thread updates
  const unsubscribeFromThread = useCallback(
    (threadId: string) => {
      if (socket) {
        socket.emit('unsubscribe:thread', { threadId })
      }
    },
    [socket],
  )

  return {
    socket,
    subscribeToThread,
    unsubscribeFromThread,
  }
}

export function useChatThreads() {
  return useQuery({
    queryKey: ['chat', 'threads'],
    queryFn: getUserThreads,
    refetchInterval: 30000, // Refetch every 30 seconds
  })
}

export function useChatThread(threadId: string | null) {
  const { subscribeToThread, unsubscribeFromThread } = useChat()

  useEffect(() => {
    if (threadId) {
      subscribeToThread(threadId)
      return () => {
        unsubscribeFromThread(threadId)
      }
    }
  }, [threadId, subscribeToThread, unsubscribeFromThread])

  return useQuery({
    queryKey: ['chat', 'thread', threadId],
    queryFn: () => getThread(threadId!),
    enabled: !!threadId,
    refetchInterval: 5000, // Refetch every 5 seconds for real-time updates
  })
}

export function useCreateThread() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (dto: CreateThreadDto) => getOrCreateThread(dto),
    onSuccess: (data) => {
      console.log('Thread created successfully:', data)
      queryClient.invalidateQueries({ queryKey: ['chat', 'threads'] })
      // Also update the cache with the new thread
      queryClient.setQueryData(['chat', 'threads'], (old: ChatThread[] | undefined) => {
        if (!old) return [data]
        // Check if thread already exists
        const exists = old.some(t => t.id === data.id)
        if (exists) return old
        return [data, ...old]
      })
    },
    onError: (error) => {
      console.error('Failed to create thread:', error)
    },
  })
}

export function useSendMessage(threadId: string) {
  const queryClient = useQueryClient()
  const { socket } = useChat()

  return useMutation({
    mutationFn: (dto: SendMessageDto) => sendMessage(threadId, dto),
    onSuccess: (message) => {
      // Optimistically update the cache
      queryClient.setQueryData(['chat', 'thread', threadId], (old: ChatThread | undefined) => {
        if (!old) return old
        return {
          ...old,
          messages: [...(old.messages || []), message],
          lastMessage: message,
          updatedAt: new Date().toISOString(),
        }
      })
      queryClient.invalidateQueries({ queryKey: ['chat', 'thread', threadId] })
      queryClient.invalidateQueries({ queryKey: ['chat', 'threads'] })
    },
  })
}
