import {
  ArrowRightFromLine,
  ArrowRightToLine,
  ChevronsRight,
  Circle,
  Clock,
  Database,
  Diamond,
  DiamondPlus,
  GripHorizontal,
  GripVertical,
  MessageSquareText,
  Square,
} from 'lucide-react';
import type React from 'react';
import { BpmnMailIcon } from '@/components/custom-nodes'; // 前回のcustom-nodesを利用
import { Separator } from '@/components/ui/separator';

interface PaletteItemProps {
  type: string;
  subType?: string;
  label: string;
  icon: React.ReactNode;
  onDragStart: (
    e: React.DragEvent,
    type: string,
    label: string,
    subType?: string,
  ) => void;
}

const PaletteItem = ({
  type,
  subType,
  label,
  icon,
  onDragStart,
}: PaletteItemProps) => (
  <div
    className="cursor-grab active:cursor-grabbing flex flex-col items-center gap-1 group text-center w-full"
    onDragStart={(e) => onDragStart(e, type, label, subType)}
    draggable
  >
    <div className="w-10 h-10 rounded border border-border bg-card flex items-center justify-center group-hover:border-primary group-hover:shadow-sm transition-all text-muted-foreground group-hover:text-primary">
      {icon}
    </div>
    <span className="text-[9px] text-muted-foreground font-medium leading-tight">
      {label}
    </span>
  </div>
);

const PaletteSection = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <div className="flex flex-col gap-3 w-full items-center">
    <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
      {title}
    </span>
    {children}
  </div>
);

export const FlowPalette = ({
  onDragStart,
}: {
  onDragStart: (
    e: React.DragEvent,
    type: string,
    label: string,
    subType?: string,
  ) => void;
}) => {
  return (
    <aside className="w-20 border-r border-sidebar-border bg-sidebar flex flex-col items-center py-4 gap-4 overflow-y-auto z-10 custom-scrollbar">
      {/* 1. Basic Shapes */}
      <PaletteSection title="基本図形">
        <PaletteItem
          type="bpmnEvent"
          subType="start"
          label="開始"
          icon={<Circle className="w-5 h-5" />}
          onDragStart={onDragStart}
        />
        <PaletteItem
          type="bpmnTask"
          label="タスク"
          icon={<Square className="w-5 h-5" />}
          onDragStart={onDragStart}
        />
        <PaletteItem
          type="bpmnAnnotation"
          label="メモ"
          icon={<MessageSquareText className="w-5 h-5" />}
          onDragStart={onDragStart}
        />
        <PaletteItem
          type="bpmnTimer"
          subType="intermediate"
          label="待機"
          icon={<Clock className="w-5 h-5" />}
          onDragStart={onDragStart}
        />
        <PaletteItem
          type="bpmnEvent"
          subType="end"
          label="終了"
          icon={<Circle className="w-5 h-5 font-black" />}
          onDragStart={onDragStart}
        />
      </PaletteSection>

      <Separator className="w-10" />

      {/* 2. Gateways */}
      <PaletteSection title="分岐">
        <PaletteItem
          type="bpmnDecision"
          label="条件分岐"
          icon={<Diamond />}
          onDragStart={onDragStart}
        />
        <PaletteItem
          type="bpmnGateway"
          subType="parallel"
          label="並行処理"
          icon={<DiamondPlus />}
          onDragStart={onDragStart}
        />
      </PaletteSection>

      <Separator className="w-10" />

      {/* 3. Messages */}
      <PaletteSection title="通信">
        <PaletteItem
          type="bpmnMessage"
          subType="send"
          label="送信"
          icon={
            <div className="relative">
              <Circle className="w-8 h-8 opacity-20" />
              <BpmnMailIcon
                className="absolute top-2 left-2 w-4 h-4"
                isFilled={true}
              />
            </div>
          }
          onDragStart={onDragStart}
        />
        <PaletteItem
          type="bpmnMessage"
          subType="receive"
          label="受信"
          icon={
            <div className="relative">
              <Circle className="w-8 h-8 opacity-20" />
              <BpmnMailIcon
                className="absolute top-2 left-2 w-4 h-4"
                isFilled={false}
              />
            </div>
          }
          onDragStart={onDragStart}
        />
      </PaletteSection>

      <Separator className="w-10" />

      {/* 4. Others */}
      <PaletteSection title="その他">
        <PaletteItem
          type="bpmnDatabase"
          label="DB"
          icon={<Database className="w-5 h-5" />}
          onDragStart={onDragStart}
        />
        <PaletteItem
          type="bpmnJump"
          subType="source"
          label="ジャンプ"
          icon={<ArrowRightFromLine className="w-4 h-4" />}
          onDragStart={onDragStart}
        />
        <PaletteItem
          type="bpmnJump"
          subType="target"
          label="着地"
          icon={<ArrowRightToLine className="w-4 h-4" />}
          onDragStart={onDragStart}
        />
        <PaletteItem
          type="bpmnArrow"
          label="矢羽"
          icon={<ChevronsRight className="w-5 h-5" />}
          onDragStart={onDragStart}
        />
        <PaletteItem
          type="bpmnSwimlane"
          subType="horizontal"
          label="レーン(横)"
          icon={<GripHorizontal className="w-5 h-5" />}
          onDragStart={onDragStart}
        />
        <PaletteItem
          type="bpmnSwimlane"
          subType="vertical"
          label="レーン(縦)"
          icon={<GripVertical className="w-5 h-5" />}
          onDragStart={onDragStart}
        />
      </PaletteSection>
    </aside>
  );
};
