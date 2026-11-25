import { DndContext, closestCenter, KeyboardSensor, PointerSensor, TouchSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { db, type Habit } from '../db';

function Row({ habit }: { habit: Habit }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: habit.id! });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };
  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-3 bg-surface2 rounded-xl p-3 select-none touch-none">
      <button {...attributes} {...listeners} className="text-muted cursor-grab active:cursor-grabbing touch-none" aria-label="Drag to reorder">
        <GripVertical size={18} />
      </button>
      <span className="text-lg">{habit.emoji}</span>
      <span className="text-sm flex-1 truncate">{habit.name}</span>
      <span className="text-xs text-muted tabular-nums">{habit.target}{habit.unit ? ` ${habit.unit}` : ''}</span>
    </div>
  );
}

export default function HabitReorderList({ habits }: { habits: Habit[] }) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  async function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = habits.findIndex((h) => h.id === active.id);
    const newIndex = habits.findIndex((h) => h.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const reordered = arrayMove(habits, oldIndex, newIndex);
    await db.transaction('rw', db.habits, async () => {
      await Promise.all(reordered.map((h, i) => db.habits.update(h.id!, { order: i })));
    });
  }

  if (habits.length === 0) {
    return <div className="text-xs text-muted">No habits yet.</div>;
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={habits.map((h) => h.id!)} strategy={verticalListSortingStrategy}>
        <div className="space-y-2">
          {habits.map((h) => (
            <Row key={h.id} habit={h} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
