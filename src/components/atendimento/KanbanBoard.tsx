import { useState } from "react";
import { 
  Clock, 
  Users, 
  MessageSquare, 
  Phone, 
  RefreshCw, 
  FileSignature,
  GripVertical,
  MoreVertical,
  Tag,
  StickyNote,
  Trash2,
  Edit
} from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { KanbanCardDialog } from "./KanbanCardDialog";

export interface KanbanCard {
  id: string;
  name: string;
  phone: string;
  notes: string;
  tags: string[];
  lastMessage: string;
  lastMessageDate: string;
  columnId: string;
}

export interface KanbanColumn {
  id: string;
  title: string;
  icon: React.ElementType;
  color: string;
  daysLimit: string;
  cards: KanbanCard[];
}

const initialColumns: KanbanColumn[] = [
  {
    id: "standby",
    title: "StandBy",
    icon: Clock,
    color: "bg-gray-500",
    daysLimit: "90d",
    cards: [
      { id: "1", name: "João Silva", phone: "(11) 99999-1234", notes: "Interessado em proteção veicular", tags: ["VIP", "Proteção"], lastMessage: "Vou analisar a proposta", lastMessageDate: "2026-02-03", columnId: "standby" },
      { id: "2", name: "Maria Santos", phone: "(11) 98888-5678", notes: "Retornar em março", tags: ["Parceria"], lastMessage: "Depois das férias conversamos", lastMessageDate: "2026-02-01", columnId: "standby" },
    ]
  },
  {
    id: "candidatos",
    title: "Candidatos",
    icon: Users,
    color: "bg-blue-500",
    daysLimit: "1d",
    cards: [
      { id: "3", name: "Carlos Oliveira", phone: "(21) 97777-9012", notes: "Lead quente - indicação do Pedro", tags: ["Indicação"], lastMessage: "Me manda mais informações", lastMessageDate: "2026-02-04", columnId: "candidatos" },
    ]
  },
  {
    id: "primeiro-contato",
    title: "1º Contato",
    icon: MessageSquare,
    color: "bg-yellow-500",
    daysLimit: "5d",
    cards: [
      { id: "4", name: "Ana Costa", phone: "(31) 96666-3456", notes: "Primeira conversa realizada", tags: ["Novo"], lastMessage: "Qual o valor mensal?", lastMessageDate: "2026-02-04", columnId: "primeiro-contato" },
    ]
  },
  {
    id: "call-negocio",
    title: "Call / Negócio",
    icon: Phone,
    color: "bg-orange-500",
    daysLimit: "3d",
    cards: [
      { id: "5", name: "Roberto Lima", phone: "(41) 95555-7890", notes: "Agendado call para amanhã 15h", tags: ["Urgente", "Call"], lastMessage: "Confirmado para amanhã", lastMessageDate: "2026-02-04", columnId: "call-negocio" },
    ]
  },
  {
    id: "follow-up",
    title: "Follow-up",
    icon: RefreshCw,
    color: "bg-purple-500",
    daysLimit: "15d",
    cards: [
      { id: "6", name: "Fernanda Souza", phone: "(51) 94444-1234", notes: "Enviou documentos, aguardando análise", tags: ["Documentos"], lastMessage: "Enviei os documentos por email", lastMessageDate: "2026-02-02", columnId: "follow-up" },
    ]
  },
  {
    id: "contrato-fechado",
    title: "Contrato Fechado",
    icon: FileSignature,
    color: "bg-green-500",
    daysLimit: "",
    cards: [
      { id: "7", name: "Lucas Mendes", phone: "(61) 93333-5678", notes: "Contrato assinado - cliente ativo", tags: ["Ativo", "Premium"], lastMessage: "Obrigado pelo atendimento!", lastMessageDate: "2026-02-04", columnId: "contrato-fechado" },
    ]
  },
];

interface KanbanBoardProps {
  searchTerm: string;
}

export function KanbanBoard({ searchTerm }: KanbanBoardProps) {
  const [columns, setColumns] = useState<KanbanColumn[]>(initialColumns);
  const [draggedCard, setDraggedCard] = useState<KanbanCard | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const [selectedCard, setSelectedCard] = useState<KanbanCard | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const filteredColumns = columns.map(col => ({
    ...col,
    cards: col.cards.filter(card => 
      card.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      card.phone.includes(searchTerm) ||
      card.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
    )
  }));

  const handleDragStart = (card: KanbanCard) => {
    setDraggedCard(card);
  };

  const handleDragOver = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    setDragOverColumn(columnId);
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = (e: React.DragEvent, targetColumnId: string) => {
    e.preventDefault();
    if (!draggedCard) return;

    setColumns(prev => prev.map(col => {
      // Remove from source column
      if (col.id === draggedCard.columnId) {
        return {
          ...col,
          cards: col.cards.filter(c => c.id !== draggedCard.id)
        };
      }
      // Add to target column
      if (col.id === targetColumnId) {
        return {
          ...col,
          cards: [...col.cards, { ...draggedCard, columnId: targetColumnId }]
        };
      }
      return col;
    }));

    setDraggedCard(null);
    setDragOverColumn(null);
  };

  const handleCardClick = (card: KanbanCard) => {
    setSelectedCard(card);
    setDialogOpen(true);
  };

  const handleCardUpdate = (updatedCard: KanbanCard) => {
    setColumns(prev => prev.map(col => ({
      ...col,
      cards: col.cards.map(c => c.id === updatedCard.id ? updatedCard : c)
    })));
  };

  const handleCardDelete = (cardId: string) => {
    setColumns(prev => prev.map(col => ({
      ...col,
      cards: col.cards.filter(c => c.id !== cardId)
    })));
    setDialogOpen(false);
  };

  return (
    <>
      <div className="flex gap-4 p-4 h-full overflow-x-auto">
        {filteredColumns.map((column) => (
          <div
            key={column.id}
            className={cn(
              "flex-shrink-0 w-80 bg-muted/50 rounded-lg flex flex-col",
              dragOverColumn === column.id && "ring-2 ring-primary"
            )}
            onDragOver={(e) => handleDragOver(e, column.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, column.id)}
          >
            {/* Column Header */}
            <div className="p-3 border-b bg-background rounded-t-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={cn("p-1.5 rounded", column.color)}>
                    <column.icon className="h-4 w-4 text-white" />
                  </div>
                  <span className="font-semibold text-sm">{column.title}</span>
                  <Badge variant="secondary" className="text-xs">
                    {column.cards.length}
                  </Badge>
                </div>
                {column.daysLimit && (
                  <Badge variant="outline" className="text-xs">
                    {column.daysLimit}
                  </Badge>
                )}
              </div>
            </div>

            {/* Cards */}
            <div className="flex-1 p-2 space-y-2 overflow-y-auto">
              {column.cards.map((card) => (
                <Card
                  key={card.id}
                  draggable
                  onDragStart={() => handleDragStart(card)}
                  onClick={() => handleCardClick(card)}
                  className={cn(
                    "cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow",
                    draggedCard?.id === card.id && "opacity-50"
                  )}
                >
                  <CardContent className="p-3 space-y-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <GripVertical className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium text-sm">{card.name}</p>
                          <p className="text-xs text-muted-foreground">{card.phone}</p>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-6 w-6">
                            <MoreVertical className="h-3 w-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleCardClick(card); }}>
                            <Edit className="h-4 w-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            className="text-destructive"
                            onClick={(e) => { e.stopPropagation(); handleCardDelete(card.id); }}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {card.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {card.tags.map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-xs px-1.5 py-0">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}

                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {card.lastMessage}
                    </p>

                    <p className="text-xs text-muted-foreground/70">
                      {new Date(card.lastMessageDate).toLocaleDateString('pt-BR')}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>

      <KanbanCardDialog
        card={selectedCard}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onUpdate={handleCardUpdate}
        onDelete={handleCardDelete}
      />
    </>
  );
}
