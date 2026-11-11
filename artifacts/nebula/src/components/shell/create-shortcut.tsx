import { Plus, AudioLines, FolderPlus, FilePenLine, Disc3 } from 'lucide-react';
import { useLocation } from 'wouter';
import { useAuth } from '@/context/AuthContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { usePressFeedback } from '@/hooks/use-press-feedback';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import './create-shortcut.css';
export function CreateShortcut() {
  const {user}=useAuth(),[,navigate]=useLocation(),mobile=useIsMobile();
  const pressFeedback=usePressFeedback();
  if(user?.role!=='artist')return null;
  return <DropdownMenu>
    <DropdownMenuTrigger asChild><button {...pressFeedback} type="button" aria-label="Create" title="Create" className="sidebar-link primary-link create-shortcut text-accent"><span className="nav-icon"><Plus className="h-6 w-6" strokeWidth={1.8}/></span><span className="sidebar-label voice text-xs">create</span></button></DropdownMenuTrigger>
    <DropdownMenuContent side={mobile?'top':'right'} align="start" sideOffset={12} className="create-menu-content">
      <DropdownMenuItem className="create-menu-item" onSelect={()=>navigate('/publish')}><AudioLines size={16} strokeWidth={1.5} aria-hidden="true"/>Publish audio or video</DropdownMenuItem>
      <DropdownMenuItem className="create-menu-item" onSelect={()=>navigate(`/profile?create=project&intent=${Date.now()}`)}><FolderPlus size={16} strokeWidth={1.5} aria-hidden="true"/>Create project</DropdownMenuItem>
      <DropdownMenuItem className="create-menu-item" onSelect={()=>navigate('/studio/remix')}><Disc3 size={16} strokeWidth={1.5} aria-hidden="true"/>Remix studio</DropdownMenuItem>
      <DropdownMenuSeparator className="create-menu-separator"/>
      <DropdownMenuItem className="create-menu-item" onSelect={()=>navigate('/studio?view=drafts')}><FilePenLine size={16} strokeWidth={1.5} aria-hidden="true"/>Continue a draft</DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>;
}
