"use client"

import React from "react"

const TOAST_LIMIT = 1
const TOAST_REMOVE_DELAY = 1000000 // Keep toasts visible for a long time for demo

const actionTypes = {
  ADD_TOAST: "ADD_TOAST",
  UPDATE_TOAST: "UPDATE_TOAST",
  DISMISS_TOAST: "DISMISS_TOAST",
  REMOVE_TOAST: "REMOVE_TOAST",
}

let count = 0

function genId() {
  count = (count + 1) % Number.MAX_SAFE_INTEGER
  return count.toString()
}

const toastTimeouts = new Map()

const ToastContext = React.createContext(null)

function ToastProvider({ children }) {
  const [state, dispatch] = React.useReducer(
    (state, action) => {
      switch (action.type) {
        case actionTypes.ADD_TOAST:
          return {
            ...state,
            toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT),
          }

        case actionTypes.UPDATE_TOAST:
          return {
            ...state,
            toasts: state.toasts.map((t) => (t.id === action.toast.id ? { ...t, ...action.toast } : t)),
          }

        case actionTypes.DISMISS_TOAST: {
          const { toastId } = action
          // ! Side effects ! - This means all toasts will be dismissed.
          // If you want to dismiss a single toast, pass the id.
          if (toastId) {
            const timeout = setTimeout(() => {
              toastTimeouts.delete(toastId)
              dispatch({
                type: actionTypes.REMOVE_TOAST,
                toastId: toastId,
              })
            }, TOAST_REMOVE_DELAY)

            toastTimeouts.set(toastId, timeout)
          } else {
            state.toasts.forEach((toast) => {
              const timeout = setTimeout(() => {
                toastTimeouts.delete(toast.id)
                dispatch({
                  type: actionTypes.REMOVE_TOAST,
                  toastId: toast.id,
                })
              }, TOAST_REMOVE_DELAY)

              toastTimeouts.set(toast.id, timeout)
            })
          }

          return {
            ...state,
            toasts: state.toasts.map((t) =>
              t.id === toastId || toastId === undefined
                ? {
                    ...t,
                    open: false,
                  }
                : t,
            ),
          }
        }
        case actionTypes.REMOVE_TOAST:
          return {
            ...state,
            toasts: state.toasts.filter((t) => t.id !== action.toastId),
          }
        default:
          throw new Error()
      }
    },
    {
      toasts: [],
    },
  )

  const addToast = React.useCallback((props) => {
    const id = genId()
    const toast = { ...props, id, open: true }
    dispatch({ type: actionTypes.ADD_TOAST, toast })
    return id
  }, [])

  const updateToast = React.useCallback((id, props) => {
    dispatch({ type: actionTypes.UPDATE_TOAST, toast: { id, ...props } })
  }, [])

  const dismissToast = React.useCallback((id) => {
    dispatch({ type: actionTypes.DISMISS_TOAST, toastId: id })
  }, [])

  const removeToast = React.useCallback((id) => {
    dispatch({ type: actionTypes.REMOVE_TOAST, toastId: id })
  }, [])

  const toast = React.useCallback(
    (props) => {
      return addToast(props)
    },
    [addToast],
  )

  const value = React.useMemo(
    () => ({
      toasts: state.toasts,
      toast,
      dismiss: dismissToast,
      update: updateToast,
      remove: removeToast,
    }),
    [state.toasts, toast, dismissToast, updateToast, removeToast],
  )

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>
}

function useToast() {
  const context = React.useContext(ToastContext)
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider")
  }
  return context
}

export { ToastProvider, useToast }
