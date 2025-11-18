import { Loader } from "lucide-react"

const loading = () => {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-white text-black">
    <Loader className="h-10 w-10 animate-spin text-blue-600" />
    </div>
  )
}
export default loading