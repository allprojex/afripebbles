import Layout from "@/components/layout/Layout";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

export default function NotFound() {
  return (
    <Layout>
      <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-md space-y-6"
        >
          <h1 className="text-6xl sm:text-8xl font-serif text-primary/20">404</h1>
          <h2 className="text-2xl sm:text-3xl font-serif">A little detour</h2>
          <p className="text-foreground/70">
            We couldn't find the page you're looking for. It might have been moved or doesn't exist yet.
          </p>
          <div className="pt-4">
            <Link href="/">
              <Button size="lg" className="rounded-full">Return Home</Button>
            </Link>
          </div>
        </motion.div>
      </div>
    </Layout>
  );
}
