import type { useNavigate } from '@ciderjs/city-gas/react';
import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  horizontalListSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { MoreVertical, Pencil, Plus, X } from 'lucide-react';
import { useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import type { RouteNames } from '@/generated/router';
import { cn } from '@/lib/utils';
import { useFlowStore } from '@/stores/flow-store';
import type { FlowSheet } from '~/types/flow';

type NavigateFunction = ReturnType<typeof useNavigate>;

// --- Props Definition ---
interface SheetTabsProps {
  flowId: string;
  version: string;
  navigate: NavigateFunction;
  routeName: RouteNames;
  readOnly?: boolean;
}

interface SortableTabItemProps {
  sheet: FlowSheet;
  flowId: string;
  version: string;
  navigate: NavigateFunction;
  routeName: RouteNames;
  readOnly?: boolean;
}

// --- Sortable Item Component ---
const SortableTabItem = ({
  sheet,
  flowId,
  version,
  navigate,
  routeName,
  readOnly,
}: SortableTabItemProps) => {
  const { activeSheetId, switchSheet, removeSheet, renameSheet } = useFlowStore(
    useShallow((state) => ({
      activeSheetId: state.activeSheetId,
      switchSheet: state.switchSheet,
      removeSheet: state.removeSheet,
      renameSheet: state.renameSheet,
    })),
  );

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: sheet.id, disabled: readOnly });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 'auto',
    position: 'relative' as const,
  };

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const isActive = sheet.id === activeSheetId;

  const handleSwitch = () => {
    if (isActive) return;
    switchSheet(sheet.id, routeName, { id: flowId, version }, navigate);
  };

  const startEditing = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (readOnly) return;
    setEditingId(sheet.id);
    setEditName(sheet.name);
  };

  const finishEditing = () => {
    if (editingId && editName.trim()) {
      renameSheet(editingId, editName);
    }
    setEditingId(null);
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    removeSheet(sheet.id, routeName, { id: flowId, version }, navigate);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        'group relative flex items-center gap-2 px-3 py-1.5 rounded-t-md border-t border-x cursor-pointer min-w-[120px] max-w-[200px] text-sm transition-all select-none',
        isActive
          ? 'bg-background border-border border-b-background -mb-px z-10 font-medium text-foreground'
          : 'bg-muted border-transparent hover:bg-muted/80 text-muted-foreground',
        isDragging && 'opacity-50',
      )}
      onClick={handleSwitch}
      onKeyUp={handleSwitch}
    >
      {editingId === sheet.id ? (
        <Input
          className="h-6 w-full px-1 py-0 text-xs bg-background"
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          onBlur={finishEditing}
          onKeyDown={(e) => e.key === 'Enter' && finishEditing()}
          autoFocus
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        />
      ) : (
        <span
          className="truncate flex-1"
          onDoubleClick={startEditing}
          title={sheet.name}
        >
          {sheet.name}
        </span>
      )}

      {!readOnly && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={cn(
                'opacity-0 group-hover:opacity-100 p-0.5 rounded-sm hover:bg-muted-foreground/20',
                isActive && 'opacity-100',
              )}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
            >
              <MoreVertical className="w-3 h-3" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={() => startEditing()}>
              <Pencil className="w-3 h-3 mr-2" /> Rename
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={handleRemove}
              className="text-destructive focus:text-destructive"
            >
              <X className="w-3 h-3 mr-2" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
};

// --- Main Container Component ---
export const SheetTabs = ({
  flowId,
  version,
  navigate,
  routeName,
  readOnly = false,
}: SheetTabsProps) => {
  const { sheets, addSheet, reorderSheets } = useFlowStore(
    useShallow((state) => ({
      sheets: state.sheets,
      addSheet: state.addSheet,
      reorderSheets: state.reorderSheets,
    })),
  );

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = sheets.findIndex((s) => s.id === active.id);
      const newIndex = sheets.findIndex((s) => s.id === over.id);
      reorderSheets(arrayMove(sheets, oldIndex, newIndex));
    }
  };

  const handleAdd = () => {
    addSheet(routeName, { id: flowId, version }, navigate);
  };

  return (
    <div className="h-10 border-t border-border bg-muted/40 flex items-center px-2 gap-1 overflow-x-auto select-none shrink-0">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={sheets.map((s) => s.id)}
          strategy={horizontalListSortingStrategy}
        >
          {sheets.map((sheet) => (
            <SortableTabItem
              key={sheet.id}
              sheet={sheet}
              flowId={flowId}
              version={version}
              navigate={navigate}
              routeName={routeName}
              readOnly={readOnly}
            />
          ))}
        </SortableContext>
      </DndContext>

      {!readOnly && (
        <Button
          variant="ghost"
          size="icon"
          className="w-8 h-8 rounded-full ml-1 hover:bg-muted-foreground/20 shrink-0"
          onClick={handleAdd}
          title="Add Sheet"
        >
          <Plus className="w-4 h-4" />
        </Button>
      )}
    </div>
  );
};
