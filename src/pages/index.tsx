import Link from "next/link";
import { Card, CardContent, Typography, Button } from "@mui/material";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-purple-50 to-white">
      <Card className="w-full max-w-lg shadow-xl rounded-2xl border border-purple-100 bg-white">
        <CardContent className="flex flex-col items-center p-8">
          <Typography
            variant="h3"
            className="font-bold text-purple-700 mb-2 tracking-tight text-center"
            component="h1"
          >
            SelfExperiment.AI
          </Typography>
          <Typography
            variant="subtitle1"
            className="mb-6 text-gray-700 text-center"
          >
            Branch out through your soul with friends and AI
          </Typography>
          <div className="flex flex-col gap-4 w-full">
            <Link href="/experiment/builder" passHref legacyBehavior>
              <Button
                variant="contained"
                color="secondary"
                className="w-full !bg-purple-600 hover:!bg-purple-700 text-white text-lg py-3 rounded-lg shadow-md transition"
                size="large"
                fullWidth
              >
                Build Experiment
              </Button>
            </Link>
            <Link href="/log" passHref legacyBehavior>
              <Button
                variant="outlined"
                color="secondary"
                className="w-full border-purple-400 text-purple-700 hover:!bg-purple-50 text-lg py-3 rounded-lg transition"
                size="large"
                fullWidth
              >
                Log Now
              </Button>
            </Link>
            <Link href="/analytics" passHref legacyBehavior>
              <Button
                variant="outlined"
                color="secondary"
                className="w-full border-purple-400 text-purple-700 hover:!bg-purple-50 text-lg py-3 rounded-lg transition"
                size="large"
                fullWidth
              >
                Analytics
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
