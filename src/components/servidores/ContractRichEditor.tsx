import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Table from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import HorizontalRule from "@tiptap/extension-horizontal-rule";
import Placeholder from "@tiptap/extension-placeholder";
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  Heading1, Heading2, Heading3, List, ListOrdered,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Minus, Table as TableIcon, Undo, Redo, Type,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const VARIABLE_GROUPS = [
  {
    label: "Dados do Tenant",
    vars: [
      { key: "tenant_nome", label: "Nome do Tenant" },
      { key: "tenant_cnpj", label: "CNPJ do Tenant" },
      { key: "tenant_razao_social", label: "Razão Social" },
      { key: "tenant_email", label: "E-mail" },
      { key: "tenant_telefone", label: "Telefone" },
      { key: "tenant_endereco", label: "Endereço" },
      { key: "tenant_cidade", label: "Cidade" },
      { key: "tenant_estado", label: "Estado" },
    ],
  },
  {
    label: "Dados do Cliente",
    vars: [
      { key: "nome_completo", label: "Nome Completo" },
      { key: "cpf", label: "CPF" },
      { key: "cnpj", label: "CNPJ" },
      { key: "razao_social", label: "Razão Social" },
      { key: "documento_contratante", label: "Documento" },
      { key: "email", label: "E-mail" },
      { key: "telefone", label: "Telefone" },
      { key: "whatsapp", label: "WhatsApp" },
      { key: "data_nascimento", label: "Data de Nascimento" },
      { key: "endereco", label: "Endereço" },
      { key: "numero", label: "Número" },
      { key: "bairro", label: "Bairro" },
      { key: "cidade", label: "Cidade" },
      { key: "estado", label: "Estado" },
      { key: "cep", label: "CEP" },
      { key: "nome_empresa", label: "Nome Empresa" },
    ],
  },
  {
    label: "Proposta",
    vars: [
      { key: "nome_item", label: "Nome do Item" },
      { key: "descricao_item", label: "Descrição" },
      { key: "valor_proposta", label: "Valor da Proposta" },
      { key: "valor_total", label: "Valor Total" },
      { key: "servicos_contratados", label: "Serviços Contratados" },
    ],
  },
  {
    label: "Vendedor",
    vars: [
      { key: "nome_vendedor", label: "Nome do Vendedor" },
      { key: "email_vendedor", label: "E-mail Vendedor" },
      { key: "telefone_vendedor", label: "Telefone Vendedor" },
      { key: "data_nascimento_vendedor", label: "Nasc. Vendedor" },
    ],
  },
  {
    label: "Assinatura",
    vars: [
      { key: "data_assinatura_cliente", label: "Data Assinatura Cliente" },
      { key: "hora_assinatura_cliente", label: "Hora Assinatura Cliente" },
      { key: "geolocalizacao_cliente", label: "Geo Cliente" },
      { key: "selfie_cliente", label: "Selfie Cliente" },
      { key: "data_assinatura_vendedor", label: "Data Assinatura Vendedor" },
      { key: "hora_assinatura_vendedor", label: "Hora Assinatura Vendedor" },
      { key: "geolocalizacao_vendedor", label: "Geo Vendedor" },
      { key: "selfie_vendedor", label: "Selfie Vendedor" },
    ],
  },
  {
    label: "Sistema",
    vars: [{ key: "data_atual", label: "Data Atual" }],
  },
];

interface Props {
  content: string;
  onChange: (html: string) => void;
  className?: string;
}

export function ContractRichEditor({ content, onChange, className }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        horizontalRule: false,
      }),
      Underline,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Table.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
      HorizontalRule,
      Placeholder.configure({ placeholder: "Comece a escrever seu contrato aqui..." }),
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class:
          "prose prose-sm max-w-none focus:outline-none min-h-[500px] px-8 py-6 " +
          "prose-headings:font-bold prose-h1:text-xl prose-h2:text-lg prose-h3:text-base " +
          "prose-p:text-sm prose-p:leading-relaxed prose-li:text-sm " +
          "prose-table:border-collapse prose-td:border prose-td:border-border prose-td:p-2 prose-td:text-sm " +
          "prose-th:border prose-th:border-border prose-th:p-2 prose-th:bg-muted prose-th:text-sm prose-th:font-semibold",
      },
    },
  });

  if (!editor) return null;

  const insertVariable = (varKey: string) => {
    editor.chain().focus().insertContent(`{{${varKey}}}`).run();
  };

  const ToolBtn = ({
    active,
    onClick,
    children,
    title,
  }: {
    active?: boolean;
    onClick: () => void;
    children: React.ReactNode;
    title?: string;
  }) => (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={cn(
        "h-8 w-8 flex items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors",
        active && "bg-accent text-accent-foreground"
      )}
    >
      {children}
    </button>
  );

  return (
    <div className={cn("flex border rounded-lg overflow-hidden bg-background", className)}>
      {/* Editor area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b bg-muted/30">
          <ToolBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} title="Negrito">
            <Bold className="h-4 w-4" />
          </ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} title="Itálico">
            <Italic className="h-4 w-4" />
          </ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive("underline")} title="Sublinhado">
            <UnderlineIcon className="h-4 w-4" />
          </ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive("strike")} title="Tachado">
            <Strikethrough className="h-4 w-4" />
          </ToolBtn>

          <Separator orientation="vertical" className="mx-1 h-6" />

          <ToolBtn onClick={() => editor.chain().focus().setParagraph().run()} active={editor.isActive("paragraph")} title="Parágrafo">
            <Type className="h-4 w-4" />
          </ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive("heading", { level: 1 })} title="Título 1">
            <Heading1 className="h-4 w-4" />
          </ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive("heading", { level: 2 })} title="Título 2">
            <Heading2 className="h-4 w-4" />
          </ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive("heading", { level: 3 })} title="Título 3">
            <Heading3 className="h-4 w-4" />
          </ToolBtn>

          <Separator orientation="vertical" className="mx-1 h-6" />

          <ToolBtn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} title="Lista">
            <List className="h-4 w-4" />
          </ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} title="Lista numerada">
            <ListOrdered className="h-4 w-4" />
          </ToolBtn>

          <Separator orientation="vertical" className="mx-1 h-6" />

          <ToolBtn onClick={() => editor.chain().focus().setTextAlign("left").run()} active={editor.isActive({ textAlign: "left" })} title="Alinhar esquerda">
            <AlignLeft className="h-4 w-4" />
          </ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().setTextAlign("center").run()} active={editor.isActive({ textAlign: "center" })} title="Centralizar">
            <AlignCenter className="h-4 w-4" />
          </ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().setTextAlign("right").run()} active={editor.isActive({ textAlign: "right" })} title="Alinhar direita">
            <AlignRight className="h-4 w-4" />
          </ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().setTextAlign("justify").run()} active={editor.isActive({ textAlign: "justify" })} title="Justificar">
            <AlignJustify className="h-4 w-4" />
          </ToolBtn>

          <Separator orientation="vertical" className="mx-1 h-6" />

          <ToolBtn onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Linha divisória">
            <Minus className="h-4 w-4" />
          </ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} title="Inserir tabela">
            <TableIcon className="h-4 w-4" />
          </ToolBtn>

          <Separator orientation="vertical" className="mx-1 h-6" />

          <ToolBtn onClick={() => editor.chain().focus().undo().run()} title="Desfazer">
            <Undo className="h-4 w-4" />
          </ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().redo().run()} title="Refazer">
            <Redo className="h-4 w-4" />
          </ToolBtn>
        </div>

        {/* Editor content */}
        <ScrollArea className="flex-1 max-h-[600px]">
          <EditorContent editor={editor} className="[&_.tiptap]:outline-none" />
        </ScrollArea>
      </div>

      {/* Variables panel */}
      <div className="w-56 border-l bg-muted/20 flex flex-col shrink-0">
        <div className="px-3 py-2 border-b">
          <p className="text-xs font-semibold text-muted-foreground">Variáveis</p>
          <p className="text-[10px] text-muted-foreground">Clique para inserir</p>
        </div>
        <ScrollArea className="flex-1 max-h-[600px]">
          <div className="p-2 space-y-3">
            {VARIABLE_GROUPS.map((group) => (
              <div key={group.label}>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 px-1">
                  {group.label}
                </p>
                <div className="space-y-0.5">
                  {group.vars.map((v) => (
                    <button
                      key={v.key}
                      type="button"
                      onClick={() => insertVariable(v.key)}
                      className="w-full text-left px-2 py-1 rounded text-[11px] hover:bg-accent hover:text-accent-foreground transition-colors truncate"
                      title={`Inserir {{${v.key}}}`}
                    >
                      <Badge variant="outline" className="text-[9px] font-mono mr-1 px-1 py-0">
                        {"{{}}"}
                      </Badge>
                      {v.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
