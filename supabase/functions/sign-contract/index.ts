import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const formData = await req.formData();
    const token = formData.get("token") as string;
    const photo = formData.get("photo") as File;
    const latitude = parseFloat(formData.get("latitude") as string);
    const longitude = parseFloat(formData.get("longitude") as string);
    const address = formData.get("address") as string;
    const signerName = formData.get("signer_name") as string | null;
    const signerDocument = formData.get("signer_document") as string | null;

    if (!token || !photo || isNaN(latitude) || isNaN(longitude)) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate photo is an image
    if (!photo.type.startsWith("image/")) {
      return new Response(
        JSON.stringify({ error: "Invalid file type" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Limit file size to 5MB
    if (photo.size > 5 * 1024 * 1024) {
      return new Response(
        JSON.stringify({ error: "File too large" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify contract exists and is pending
    const { data: contract, error: fetchErr } = await supabase
      .from("contracts")
      .select("id, signature_status")
      .eq("signing_token", token)
      .eq("signature_status", "pending")
      .maybeSingle();

    if (fetchErr || !contract) {
      return new Response(
        JSON.stringify({ error: "Contract not found or already signed" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Upload photo
    const fileName = `${contract.id}_${Date.now()}.jpg`;
    const arrayBuffer = await photo.arrayBuffer();
    const { error: uploadErr } = await supabase.storage
      .from("signatures")
      .upload(fileName, arrayBuffer, { contentType: photo.type });

    if (uploadErr) {
      return new Response(
        JSON.stringify({ error: "Failed to upload photo" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: urlData } = supabase.storage
      .from("signatures")
      .getPublicUrl(fileName);

    // Update contract
    const { error: updateErr } = await supabase
      .from("contracts")
      .update({
        signature_status: "signed",
        signed_at: new Date().toISOString(),
        signature_photo_url: urlData.publicUrl,
        signature_latitude: latitude,
        signature_longitude: longitude,
        signature_address: address,
        signer_name: signerName || null,
        signer_document: signerDocument || null,
      })
      .eq("signing_token", token)
      .eq("signature_status", "pending");

    if (updateErr) {
      return new Response(
        JSON.stringify({ error: "Failed to update contract" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
