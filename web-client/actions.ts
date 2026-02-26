// app/actions.ts
"use server"

import { signIn } from "@/app/lib/auth" // import จาก config ที่เราทำไว้

export async function handleGoogleLogin() {
  // สั่งให้ login ผ่าน google และเมื่อเสร็จให้ไปหน้า /chat
  await signIn("google", { redirectTo: "/main?view=overview" })
}