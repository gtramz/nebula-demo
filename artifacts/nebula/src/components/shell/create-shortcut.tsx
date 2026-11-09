import { Plus, AudioLines, FolderPlus, FilePenLine, Disc3 } from 'lucide-react';
import { useLocation } from 'wouter';
import { useAuth } from '@/context/AuthContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
export function CreateShortcut() {
  const {user}=useAuth(),[,navigate]=useLocation(),mobile=useIsMobile();
  if(user?.role!=='artist')return null;
  return <DropdownMenu><DropdownMenuTrigger asChild><button aria-label="Create" title="Create" className="sidebar-link primary-link create-shortcut text-accent"><span className="nav-icon"><Plus className="h-6 w-6" strokeWidth={1.8}/></span><span className="sidebar-label voice text-xs">create</span></button></DropdownMenuTrigger><DropdownMenuContent side={mobile?'top':'right'} align="start" sideOffset={12} className="w-64 p-2"><DropdownMenuLabel className="text-xs text-muted">Make something new</DropdownMenuLabel><DropdownMenuItem className="min-h-12 gap-3" onSelect={()=>navigate('/publish')}><AudioLines size={18}/>Publish audio or video</DropdownMenuItem><DropdownMenuItem className="min-h-12 gap-3" onSelect={()=>navigate(`/profile?create=project&intent=${Date.now()}`)}><FolderPlus size={18}/>Create project</DropdownMenuItem><DropdownMenuItem className="min-h-12 gap-3" onSelect={()=>navigate('/studio/remix')}><Disc3 size={18}/>Remix studio</DropdownMenuItem><DropdownMenuSeparator/><DropdownMenuItem className="min-h-12 gap-3" onSelect={()=>navigate('/studio?view=drafts')}><FilePenLine size={18}/>Continue a draft</DropdownMenuItem></DropdownMenuContent></DropdownMenu>;
}
