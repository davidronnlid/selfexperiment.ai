import { useState } from "react";
import { supabase } from "@/utils/supaBase";
import {
  Container,
  Typography,
  TextField,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Box,
  Paper,
} from "@mui/material";
import Link from "next/link";

export default function CommunityPage() {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    if (e.target.value.length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("username")
      .ilike("username", `%${e.target.value}%`)
      .limit(10);
    console.log("Search results:", data, error);
    setResults(data || []);
    setLoading(false);
  };

  return (
    <Container maxWidth="sm" sx={{ py: 6 }}>
      <Typography variant="h4" align="center" gutterBottom>
        Community
      </Typography>
      <Typography align="center" sx={{ mb: 3 }}>
        Search for users by username to view their public profile and shared
        variables.
      </Typography>
      <TextField
        label="Search by username"
        value={search}
        onChange={handleSearch}
        fullWidth
        sx={{ mb: 3 }}
        autoFocus
      />
      <Paper>
        <List>
          {results.map((user) => (
            <ListItem key={user.username} disablePadding>
              <ListItemButton
                component={Link}
                href={`/community/${user.username}`}
              >
                <ListItemText primary={user.username} />
              </ListItemButton>
            </ListItem>
          ))}
          {!loading && results.length === 0 && search.length > 1 && (
            <ListItem>
              <ListItemText primary="No users found." />
            </ListItem>
          )}
        </List>
      </Paper>
    </Container>
  );
}
