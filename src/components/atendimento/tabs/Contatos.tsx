import { useState } from "react";
import { Search, Plus, Phone, Tag, MoreHorizontal, User } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { mockContacts, mockLabels } from "../mock-data";

export function Contatos() {
  const [search, setSearch] = useState("");
  const filtered = mockContacts.filter(
    (c) => c.name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search)
  );

  const getInitials = (name: string) =>
    name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Contatos</h2>
          <p className="text-sm text-muted-foreground">{mockContacts.length} contatos cadastrados</p>
        </div>
        <Button className="gap-2" size="sm">
          <Plus className="h-4 w-4" /> Novo Contato
        </Button>
      </div>

      <div className="relative w-72">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar contato..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9 text-sm" />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Contato</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Etiquetas</TableHead>
                <TableHead>Atribuído</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((contact) => (
                <TableRow key={contact.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-primary/10 text-primary text-[10px]">{getInitials(contact.name)}</AvatarFallback>
                      </Avatar>
                      <span className="font-medium text-sm">{contact.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{contact.phone}</TableCell>
                  <TableCell>
                    <div className="flex gap-1 flex-wrap">
                      {contact.labels.map((labelId) => {
                        const label = mockLabels.find((l) => l.id === labelId);
                        if (!label) return null;
                        return (
                          <span key={labelId} className="text-[10px] px-1.5 py-0.5 rounded-full text-white" style={{ backgroundColor: label.color }}>
                            {label.name}
                          </span>
                        );
                      })}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{contact.assignedTo || "—"}</TableCell>
                  <TableCell>
                    <Badge variant={contact.status === "online" ? "default" : "secondary"} className="text-[10px]">
                      {contact.status === "online" ? "Online" : "Offline"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button size="icon" variant="ghost" className="h-7 w-7">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
