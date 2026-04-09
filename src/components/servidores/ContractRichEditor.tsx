import { useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { HorizontalRule } from "@tiptap/extension-horizontal-rule";
import { Placeholder } from "@tiptap/extension-placeholder";
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  Heading1, Heading2, Heading3, List, ListOrdered,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Minus, Table as TableIcon, Undo, Redo, Type,
  LayoutTemplate, ChevronDown,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
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

const PREBUILT_BLOCKS = [
  {
    label: "Cabeçalho com Timbre",
    html: `<p style="text-align: center"><strong>{{tenant_nome}}</strong></p><p style="text-align: center">CNPJ: {{tenant_cnpj}}</p><p style="text-align: center">{{tenant_endereco}} — {{tenant_cidade}}/{{tenant_estado}}</p><p style="text-align: center">{{tenant_email}} | {{tenant_telefone}}</p><hr>`,
  },
  {
    label: "Qualificação das Partes",
    html: `<h2>QUALIFICAÇÃO DAS PARTES</h2><p><strong>CONTRATANTE:</strong> {{nome_completo}}, inscrito(a) no CPF/CNPJ sob nº {{documento_contratante}}, residente e domiciliado(a) em {{endereco}}, {{numero}}, {{bairro}}, {{cidade}}/{{estado}}, CEP {{cep}}, e-mail {{email}}, telefone {{telefone}}.</p><p><strong>CONTRATADA:</strong> {{tenant_razao_social}}, inscrita no CNPJ sob nº {{tenant_cnpj}}, com sede em {{tenant_endereco}}, {{tenant_cidade}}/{{tenant_estado}}, neste ato representada por {{nome_vendedor}}.</p>`,
  },
  {
    label: "Cláusula — Serviços Contratados",
    html: `<h2>CLÁUSULA — DOS SERVIÇOS CONTRATADOS</h2><p>O presente contrato tem por objeto a prestação dos seguintes serviços:</p><p>{{servicos_contratados}}</p><p><strong>Valor total do contrato: {{valor_total}}</strong></p>`,
  },
  {
    label: "Cláusula Padrão (em branco)",
    html: `<h2>CLÁUSULA — [TÍTULO DA CLÁUSULA]</h2><p>[Conteúdo da cláusula]</p>`,
  },
  {
    label: "Bloco de Assinatura — Cliente",
    html: `<hr><h3>ASSINATURA DO CONTRATANTE</h3><p><strong>Nome:</strong> {{nome_completo}}</p><p><strong>Documento:</strong> {{documento_contratante}}</p><p><strong>Data de Nascimento:</strong> {{data_nascimento}}</p><p><strong>Data/Hora:</strong> {{data_assinatura_cliente}} às {{hora_assinatura_cliente}}</p><p><strong>Geolocalização:</strong> {{geolocalizacao_cliente}}</p><p><strong>Selfie:</strong> {{selfie_cliente}}</p><p>_________________________________________</p><p style="text-align: center">{{nome_completo}}</p>`,
  },
  {
    label: "Bloco de Assinatura — Vendedor/Empresa",
    html: `<hr><h3>ASSINATURA DA CONTRATADA</h3><p><strong>Empresa:</strong> {{tenant_nome}}</p><p><strong>CNPJ:</strong> {{tenant_cnpj}}</p><p><strong>Representante:</strong> {{nome_vendedor}}</p><p><strong>E-mail:</strong> {{email_vendedor}}</p><p><strong>Data/Hora:</strong> {{data_assinatura_vendedor}} às {{hora_assinatura_vendedor}}</p><p><strong>Geolocalização:</strong> {{geolocalizacao_vendedor}}</p><p><strong>Selfie:</strong> {{selfie_vendedor}}</p><p>_________________________________________</p><p style="text-align: center">{{nome_vendedor}}</p>`,
  },
  {
    label: "Rodapé Corporativo",
    html: `<hr><p style="text-align: center"><em>{{tenant_nome}} — CNPJ: {{tenant_cnpj}}</em></p><p style="text-align: center"><em>{{tenant_endereco}} — {{tenant_cidade}}/{{tenant_estado}}</em></p><p style="text-align: center"><em>Documento gerado em {{data_atual}}</em></p>`,
  },
  {
    label: "Foro e Disposições Finais",
    html: `<h2>CLÁUSULA — DO FORO</h2><p>As partes elegem o foro da comarca de {{tenant_cidade}}/{{tenant_estado}} como competente para dirimir quaisquer questões oriundas do presente contrato, com renúncia a qualquer outro, por mais privilegiado que seja.</p><p>E por estarem justas e contratadas, as partes assinam o presente instrumento em via digital.</p><p><strong>{{tenant_cidade}}, {{data_atual}}</strong></p>`,
  },
];

interface Props {
  content: string;
  onChange: (html: string) => void;
  className?: string;
}

export function ContractRichEditor({ content, onChange, className }: Props) {
  const [sidebarTab, setSidebarTab] = useState<"vars" | "blocks">("vars");

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
      Placeholder.configure({ placeholder: "Comece a escrever seu contrato aqui ou insira um bloco pronto..." }),
    ],
    content,
    onUpdate: ({ editor: e }) => {
      onChange(e.getHTML());
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

  const insertBlock = (html: string) => {
    editor.chain().focus().insertContent(html).run();
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

          <ToolBtn onClick={() => editor.chain().focus().setTextAlign("left").run()} active={editor.isActive({ textAlign: "left" })} title="Esquerda">
            <AlignLeft className="h-4 w-4" />
          </ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().setTextAlign("center").run()} active={editor.isActive({ textAlign: "center" })} title="Centro">
            <AlignCenter className="h-4 w-4" />
          </ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().setTextAlign("right").run()} active={editor.isActive({ textAlign: "right" })} title="Direita">
            <AlignRight className="h-4 w-4" />
          </ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().setTextAlign("justify").run()} active={editor.isActive({ textAlign: "justify" })} title="Justificar">
            <AlignJustify className="h-4 w-4" />
          </ToolBtn>

          <Separator orientation="vertical" className="mx-1 h-6" />

          <ToolBtn onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Linha divisória">
            <Minus className="h-4 w-4" />
          </ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} title="Tabela">
            <TableIcon className="h-4 w-4" />
          </ToolBtn>

          <Separator orientation="vertical" className="mx-1 h-6" />

          {/* Blocks dropdown in toolbar */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="h-8 px-2 flex items-center gap-1 rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors text-xs"
                title="Inserir bloco pronto"
              >
                <LayoutTemplate className="h-4 w-4" />
                <span className="hidden sm:inline">Blocos</span>
                <ChevronDown className="h-3 w-3" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64">
              {PREBUILT_BLOCKS.map((block, i) => (
                <DropdownMenuItem key={i} onClick={() => insertBlock(block.html)} className="text-xs cursor-pointer">
                  <LayoutTemplate className="h-3.5 w-3.5 mr-2 shrink-0" />
                  {block.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

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

      {/* Sidebar panel */}
      <div className="w-60 border-l bg-muted/20 flex flex-col shrink-0">
        {/* Tabs */}
        <div className="flex border-b">
          <button
            type="button"
            onClick={() => setSidebarTab("vars")}
            className={cn(
              "flex-1 px-3 py-2 text-[11px] font-medium transition-colors",
              sidebarTab === "vars" ? "border-b-2 border-primary text-primary" : "text-muted-foreground hover:text-foreground"
            )}
          >
            Variáveis
          </button>
          <button
            type="button"
            onClick={() => setSidebarTab("blocks")}
            className={cn(
              "flex-1 px-3 py-2 text-[11px] font-medium transition-colors",
              sidebarTab === "blocks" ? "border-b-2 border-primary text-primary" : "text-muted-foreground hover:text-foreground"
            )}
          >
            Blocos Prontos
          </button>
        </div>

        <ScrollArea className="flex-1 max-h-[560px]">
          {sidebarTab === "vars" ? (
            <div className="p-2 space-y-3">
              <p className="text-[10px] text-muted-foreground px-1">Clique para inserir no cursor</p>
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
                        title={`{{${v.key}}}`}
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
          ) : (
            <div className="p-2 space-y-1">
              <p className="text-[10px] text-muted-foreground px-1 mb-2">Clique para inserir um bloco</p>
              {PREBUILT_BLOCKS.map((block, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => insertBlock(block.html)}
                  className="w-full text-left px-2 py-2 rounded text-[11px] hover:bg-accent hover:text-accent-foreground transition-colors border border-transparent hover:border-border"
                >
                  <div className="flex items-center gap-2">
                    <LayoutTemplate className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <span>{block.label}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
}
