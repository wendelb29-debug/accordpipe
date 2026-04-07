type LeadContractSignerLike = {
  id: string;
  signer_role?: string | null;
  signed_at?: string | null;
  signer_name?: string | null;
  signer_document?: string | null;
};

const FIXED_LEAD_SIGNER_ROLES = new Set(["cliente", "vendedor"]);

const shouldReplaceSigner = <T extends LeadContractSignerLike>(current: T, candidate: T) => {
  if (candidate.signed_at && !current.signed_at) return true;
  if (!candidate.signed_at && current.signed_at) return false;
  if (candidate.signer_name && !current.signer_name) return true;
  if (candidate.signer_document && !current.signer_document) return true;
  return false;
};

export const normalizeLeadContractSigners = <T extends LeadContractSignerLike>(signers: T[]) => {
  const uniqueByKey = new Map<string, T>();
  const duplicateIds: string[] = [];

  for (const signer of signers) {
    const key = FIXED_LEAD_SIGNER_ROLES.has(signer.signer_role || "")
      ? String(signer.signer_role)
      : signer.id;

    const existing = uniqueByKey.get(key);

    if (!existing) {
      uniqueByKey.set(key, signer);
      continue;
    }

    if (shouldReplaceSigner(existing, signer)) {
      duplicateIds.push(existing.id);
      uniqueByKey.set(key, signer);
      continue;
    }

    duplicateIds.push(signer.id);
  }

  return {
    uniqueSigners: Array.from(uniqueByKey.values()),
    duplicateIds,
  };
};

export const getLeadContractSignatureStats = <T extends LeadContractSignerLike>(signers: T[]) => {
  const { uniqueSigners } = normalizeLeadContractSigners(signers);
  const signed = uniqueSigners.filter((signer) => Boolean(signer.signed_at)).length;
  const total = uniqueSigners.length;

  return {
    signed,
    total,
    allSigned: total > 0 && signed === total,
    uniqueSigners,
  };
};