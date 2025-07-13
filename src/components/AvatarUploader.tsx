import { useEffect, useState } from "react";
import { supabase } from "@/utils/supaBase";
import Avatar from "@mui/material/Avatar";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { FaCamera, FaUser } from "react-icons/fa";

interface Props {
  currentAvatarUrl?: string | null;
  onUpload: (url: string) => void;
}

export default function AvatarUploader({ currentAvatarUrl, onUpload }: Props) {
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    if (currentAvatarUrl) {
      getPublicUrl(currentAvatarUrl);
    } else {
      setPreviewUrl(null);
    }
  }, [currentAvatarUrl]);

  const getPublicUrl = (path: string) => {
    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    setPreviewUrl(data.publicUrl);
  };

  const uploadAvatar = async (file: File) => {
    try {
      setUploading(true);

      // Get user ID from current user
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}.${fileExt}`;
      const filePath = `${fileName}`;

      let { error } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true });

      if (error) throw error;

      onUpload(filePath);
      getPublicUrl(filePath);
    } catch (error: any) {
      console.error("Upload error:", error);
      alert(error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (!event.target.files || event.target.files.length === 0) {
      return;
    }
    const file = event.target.files[0];
    await uploadAvatar(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith("image/")) {
        await uploadAvatar(file);
      }
    }
  };

  return (
    <Box className="flex flex-col items-center gap-4">
      {/* Avatar Display */}
      <Box
        className={`relative group cursor-pointer transition-all duration-300 ${
          dragOver ? "scale-105" : "hover:scale-105"
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <Avatar
          src={previewUrl || undefined}
          alt="Profile Picture"
          sx={{
            width: { xs: 80, sm: 96, md: 120 },
            height: { xs: 80, sm: 96, md: 120 },
            border: "3px solid var(--gold)",
            boxShadow: "var(--shadow-md)",
            transition: "all var(--transition-normal)",
            "&:hover": {
              boxShadow: "var(--shadow-lg)",
              transform: "scale(1.02)",
            },
          }}
        >
          {!previewUrl && <FaUser className="text-2xl text-gold" />}
        </Avatar>

        {/* Upload Overlay */}
        <Box
          className={`absolute inset-0 flex items-center justify-center bg-black/50 rounded-full transition-all duration-300 ${
            dragOver ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          }`}
        >
          <FaCamera className="text-white text-xl" />
        </Box>

        {/* Upload Progress */}
        {uploading && (
          <Box className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-full">
            <CircularProgress size={32} className="text-gold" thickness={4} />
          </Box>
        )}
      </Box>

      {/* Upload Button */}
      <Box className="flex flex-col items-center gap-2">
        <Typography
          variant="body2"
          className="text-text-secondary text-center font-medium"
        >
          Profile Picture
        </Typography>

        <label className="cursor-pointer">
          <input
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            style={{ display: "none" }}
            disabled={uploading}
          />
          <Button
            variant="outlined"
            component="span"
            disabled={uploading}
            startIcon={
              uploading ? <CircularProgress size={16} /> : <FaCamera />
            }
            className="transition-all duration-300 hover:bg-gold/10"
            sx={{
              borderColor: "var(--gold)",
              color: "var(--gold)",
              "&:hover": {
                borderColor: "var(--gold-light)",
                color: "var(--gold-light)",
                backgroundColor: "rgba(255, 215, 0, 0.1)",
              },
            }}
          >
            {uploading ? "Uploading..." : "Change Picture"}
          </Button>
        </label>

        <Typography
          variant="caption"
          className="text-text-muted text-center max-w-xs"
        >
          Drag and drop an image here or click to browse
        </Typography>
      </Box>
    </Box>
  );
}
