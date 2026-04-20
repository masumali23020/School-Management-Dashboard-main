import Image from "next/image"
import Link from "next/link"
import { auth } from "@/auth"
import { SignOutButton } from "./SignOutButton"

const Navbar = async () => {
  const session = await auth()

  const user = session?.user
  const userName = user?.name || "Guest"

  return (
    <div className="flex items-center justify-between p-4">
      {/* SEARCH BAR */}
      <div className="hidden md:flex items-center gap-2 text-xs rounded-full ring-[1.5px] ring-gray-300 px-2">
        <Image src="/search.png" alt="" width={14} height={14} />
        <input
          type="text"
          placeholder="Search..."
         
          className="w-[200px] p-2 bg-transparent outline-none"
        />
      </div>

      {/* ICONS AND USER */}
      <div className="flex items-center gap-6 justify-end w-full">
        <div className="bg-white rounded-full w-7 h-7 flex items-center justify-center cursor-pointer">
          <Image src="/message.png" alt="" width={20} height={20} />
        </div>

        <div className="bg-white rounded-full w-7 h-7 flex items-center justify-center cursor-pointer relative">
          <Image src="/announcement.png" alt="" width={20} height={20} />
          <div className="absolute -top-3 -right-3 w-5 h-5 flex items-center justify-center bg-purple-500 text-white rounded-full text-xs">
            1
          </div>
        </div>

        <div className="flex flex-col">
          <span className="text-xs leading-3 font-medium">{userName}</span>
          <span className="text-[10px] text-gray-500 text-right">
            {user?.role || "USER"}
          </span>
        </div>

       {user?.image ? (
  <Image
    src={user.image}
    alt="user"
    width={36}
    height={36}
    className="rounded-full object-cover"
  />
) : (
  <div className="w-9 h-9 rounded-full bg-purple-500 flex items-center justify-center text-white font-semibold">
    {user?.name?.charAt(0)?.toUpperCase() || "U"}
  </div>
)}
        {/* Logout */}
        <SignOutButton />
      </div>
    </div>
  )
}

export default Navbar