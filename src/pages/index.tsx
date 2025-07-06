import Link from "next/link";
import { Card, CardContent, Typography, Button } from "@mui/material";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-gray-900 to-black">
      <Card className="w-full max-w-lg shadow-xl rounded-2xl border border-gray-700 bg-gray-800/90 backdrop-blur-sm">
        <CardContent className="flex flex-col items-center p-8">
          <Typography
            variant="h3"
            className="font-bold text-white mb-2 tracking-tight text-center"
            component="h1"
          >
            SelfExperiment.AI
          </Typography>
          <Typography
            variant="subtitle1"
            className="mb-6 text-gray-200 text-center"
          >
            Understand yourself better with AI
          </Typography>
          <div className="flex flex-col gap-4 w-full">
            <Link href="/experiment/builder" passHref legacyBehavior>
              <Button
                variant="contained"
                className="w-full !bg-blue-600 hover:!bg-blue-700 text-white text-lg py-3 rounded-lg shadow-md transition"
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
                className="w-full border-gray-400 text-gray-200 hover:!bg-gray-700 text-lg py-3 rounded-lg transition"
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
                className="w-full border-gray-400 text-gray-200 hover:!bg-gray-700 text-lg py-3 rounded-lg transition"
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
