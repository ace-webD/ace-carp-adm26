import { supabase } from "./supabase";

export async function uploadEvent({
  event_name,
  start_time,
  venue,
  image,
  form_link,
  category,
  event_type,
}) {
  if (!image) throw new Error("No image provided");

  const fileName = `${Date.now()}_${image.name}`;
  const bucketName = "event-posters";

  // Upload image
  const { error: uploadError } = await supabase.storage
    .from(bucketName)
    .upload(fileName, image);

  if (uploadError) {
    throw new Error("Image upload failed: " + uploadError.message);
  }

  // Get image URL (generate signed URL to ensure access even if the bucket is private)
  let finalImageUrl = "";
  const { data: signedData, error: signedError } = await supabase.storage
    .from(bucketName)
    .createSignedUrl(fileName, 60 * 60 * 24 * 365 * 5); // 5 years

  if (!signedError && signedData?.signedUrl) {
    finalImageUrl = signedData.signedUrl;
  } else {
    const { data: publicData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(fileName);
    finalImageUrl = publicData.publicUrl;
  }

  // Insert event
  const { error: insertError } = await supabase
    .from("Events")
    .insert([
      {
        Name: event_name,
        Venue: venue,
        Time: start_time,
        img_url: finalImageUrl,
        gform_link: form_link,
        category: category || event_type,
      },
    ]);

  if (insertError) {
    throw new Error("Insert failed: " + insertError.message);
  }

  return finalImageUrl;
}