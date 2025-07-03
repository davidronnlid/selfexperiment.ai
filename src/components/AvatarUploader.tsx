import { useEffect, useState } from "react";
import { supabase } from "@/utils/supaBase";
import Avatar from "@mui/material/Avatar";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";

interface Props {
  userId: string;
  avatarUrl: string | null;
  onUpload: (url: string) => void;
}

export default function AvatarUploader({ userId, avatarUrl, onUpload }: Props) {
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (avatarUrl) {
      getPublicUrl(avatarUrl);
    } else {
      setPreviewUrl(null);
    }
  }, [avatarUrl]);

  const getPublicUrl = (path: string) => {
    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    setPreviewUrl(data.publicUrl);
  };

  const uploadAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      if (!event.target.files || event.target.files.length === 0) {
        throw new Error("You must select an image to upload.");
      }
      const file = event.target.files[0];
      const fileExt = file.name.split(".").pop();
      const fileName = `${userId}.${fileExt}`;
      const filePath = `${fileName}`;

      let { error } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true });

      if (error) throw error;

      onUpload(filePath);
      getPublicUrl(filePath);
    } catch (error: any) {
      alert(error.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <Avatar
        src={previewUrl || undefined}
        alt="Profile Picture"
        sx={{ width: 96, height: 96 }}
      />
      <label>
        <input
          type="file"
          accept="image/*"
          onChange={uploadAvatar}
          style={{ display: "none" }}
          disabled={uploading}
        />
        <Button
          variant="outlined"
          component="span"
          disabled={uploading}
          startIcon={uploading ? <CircularProgress size={16} /> : null}
        >
          {uploading ? "Uploading..." : "Change Picture"}
        </Button>
      </label>
    </div>
  );
}
