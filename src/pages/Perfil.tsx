import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MinhaContaDialog } from "@/components/minha-conta/MinhaContaDialog";

export default function Perfil() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(true);

  return (
    <MinhaContaDialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) navigate(-1);
      }}
    />
  );
}
