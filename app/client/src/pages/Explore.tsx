import { useEffect, useState } from 'react';
import DesktopSidebar from '@/components/Sidebar/DesktopSidebar';
import { AlertCircle, Globe, GripVertical } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet"
import AboutBuildLab from '@/components/About/AboutBuildLab';
import ExploreComponent from '@/components/ExploreComponent/ExploreComponent';
import { toast } from 'sonner';

export default function Explore() {
  const theme = localStorage.getItem('vite-ui-theme');
  const [showSidebar, setShowSidebar] = useState(false);

  useEffect(() => {
    if (navigator.onLine) {
      toast.error(<><Globe className='h-4 w-4' /> Not connected to Internet. Please try again!</>)
    }
  }, [theme]);

  const handleMenuClick = () => {
    setShowSidebar(!showSidebar);
  };

  return (
    <div className="h-screen flex bg-zinc-300 dark:bg-zinc-800">
      {/* Sidebar container */}
      <div
        className={`fixed left-0 top-0 h-full z-50 transform transition-transform duration-300 ease-in-out h-full ${showSidebar ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}
      >
        <DesktopSidebar />
      </div>
      {showSidebar && (
        <div className="fixed inset-0 bg-black/80 z-40" onClick={handleMenuClick}></div>
      )}
      <ExploreComponent />
      <div className='fixed top-0 flex justify-between w-full p-3 backdrop-blur-sm md:hidden items-center border-b'>
        <div className='flex items-center gap-2'>
          <div className="md:hidden" onClick={handleMenuClick}>
            <GripVertical className='h-5 w-5' />
          </div>
          <div className="md:hidden">
            <span className='text-[20px]'>BuildLab</span>
          </div>
        </div>
        <div className="md:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <AlertCircle style={{ transform: 'rotate(180deg)' }} className='h-5 w-5' />
            </SheetTrigger>
            <SheetContent>
              <AboutBuildLab />
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </div>
  );
}
