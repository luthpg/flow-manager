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
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { FlowSheet } from '~/types/flow';

// --- Props Definition ---
interface SheetTabsProps {
  sheets: FlowSheet[];
  activeSheetId: string;
  onSwitch: (id: string) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onReorder: (newSheets: FlowSheet[]) => void;
  readOnly?: boolean;
}

// --- Sortable Item Component ---
interface SortableTabItemProps
  extends Omit<SheetTabsProps, 'sheets' | 'onAdd' | 'onReorder'> {
  sheet: FlowSheet;
}

const SortableTabItem = ({
  sheet,
  activeSheetId,
  onSwitch,
  onRemove,
  onRename,
  readOnly,
}: SortableTabItemProps) => {
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
    zIndex: isDragging ? 50 : 'auto', // ドラッグ中は最前面に
    position: 'relative' as const,
  };

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const isActive = sheet.id === activeSheetId;

  const startEditing = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (readOnly) return;
    setEditingId(sheet.id);
    setEditName(sheet.name);
  };

  const finishEditing = () => {
    if (editingId && editName.trim()) {
      onRename(editingId, editName);
    }
    setEditingId(null);
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
      onClick={() => !isActive && onSwitch(sheet.id)}
      onKeyUp={() => !isActive && onSwitch(sheet.id)}
    >
      {/* Name or Input */}
      {editingId === sheet.id ? (
        <Input
          className="h-6 w-full px-1 py-0 text-xs bg-background"
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          onBlur={finishEditing}
          onKeyDown={(e) => e.key === 'Enter' && finishEditing()}
          autoFocus
          onClick={(e) => e.stopPropagation()} // ドラッグ開始を防ぐ
          onPointerDown={(e) => e.stopPropagation()} // DndKitのセンサー回避
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

      {/* Menu (Rename / Delete) */}
      {!readOnly && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={cn(
                'opacity-0 group-hover:opacity-100 p-0.5 rounded-sm hover:bg-muted-foreground/20',
                isActive && 'opacity-100',
              )}
              // メニューを開くクリックがドラッグとして認識されないようにする
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
              onClick={(e) => {
                e.stopPropagation();
                onRemove(sheet.id);
              }}
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
  sheets,
  activeSheetId,
  onSwitch,
  onAdd,
  onRemove,
  onRename,
  onReorder,
  readOnly = false,
}: SheetTabsProps) => {
  // センサー設定: クリックとドラッグを区別するため、5px以上動いた時だけドラッグとみなす
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
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
      // 配列を並べ替えて親に通知
      onReorder(arrayMove(sheets, oldIndex, newIndex));
    }
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
              activeSheetId={activeSheetId}
              onSwitch={onSwitch}
              onRemove={onRemove}
              onRename={onRename}
              readOnly={readOnly}
            />
          ))}
        </SortableContext>
      </DndContext>

      {/* Add Button */}
      {!readOnly && (
        <Button
          variant="ghost"
          size="icon"
          className="w-8 h-8 rounded-full ml-1 hover:bg-muted-foreground/20 shrink-0"
          onClick={onAdd}
          title="Add Sheet"
        >
          <Plus className="w-4 h-4" />
        </Button>
      )}
    </div>
  );
};
