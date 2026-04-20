"use client"

import { signOut } from "next-auth/react"

export function SignOutButton() {
  return (
    <button
      onClick={() => signOut()}
      className="text-xs bg-gray-200 px-2 py-1 rounded"
    >
      Logout
    </button>
  )
}