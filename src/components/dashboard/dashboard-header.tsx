import { LayoutGrid, Menu, Search, X } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { ModeToggle } from '@/components/mode-toggle';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useDashboardStore } from '@/store/dashboard-store';
import { CreateFlowDialog } from './create-flow-dialog';

export function DashboardHeader() {
  const {
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    userEmail,
  } = useDashboardStore(
    useShallow((state) => ({
      searchTerm: state.searchTerm,
      setSearchTerm: state.setSearchTerm,
      statusFilter: state.statusFilter,
      setStatusFilter: state.setStatusFilter,
      userEmail: state.userEmail,
    })),
  );

  return (
    <header className="sticky top-0 z-30 w-full bg-background/80 backdrop-blur-md border-b">
      <div className="flex h-16 items-center px-4 gap-4 max-w-7xl mx-auto">
        <div className="flex items-center gap-3 shrink-0">
          <Button variant="ghost" size="icon" className="md:hidden">
            <Menu className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2 font-bold text-lg md:text-xl text-primary">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <LayoutGrid className="w-5 h-5 text-primary" />
            </div>
            <span className="hidden sm:inline">Flow Manager</span>
          </div>
        </div>

        <div className="flex-1 max-w-xl mx-auto relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <Input
            placeholder="Search flows..."
            className="pl-9 pr-9 bg-muted/50 border-transparent focus:bg-background focus:border-primary/50 transition-all rounded-full"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="hidden md:flex items-center gap-2 mr-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[130px] h-9 text-xs rounded-full border-dashed">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent align="end">
                <SelectItem value="ALL">All Status</SelectItem>
                <SelectItem value="PUBLISHED">Published</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="DRAFT">Draft</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="hidden sm:block">
            <CreateFlowDialog />
          </div>
          <ModeToggle />
          <Avatar className="h-8 w-8 border border-border">
            <AvatarImage src={`https://avatar.vercel.sh/${userEmail}`} />
            <AvatarFallback>U</AvatarFallback>
          </Avatar>
        </div>
      </div>
    </header>
  );
}
