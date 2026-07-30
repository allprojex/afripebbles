import Layout from "@/components/layout/Layout";
import { Seo } from "@/components/Seo";
import { motion } from "framer-motion";
import { HelpCircle } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { faqGroups } from "@/content/faq";

export default function Faq() {
  const fadeInUp = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
  };

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqGroups.flatMap((group) =>
      group.items.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: { "@type": "Answer", text: item.answer },
      }))
    ),
  };

  return (
    <Layout>
      <Seo
        title="FAQ"
        description="Answers to common questions about AfriPebbles' products, pre-orders, shipping, and collaborations."
        path="/faq"
        jsonLd={jsonLd}
      />
      <div className="bg-muted/30 border-b border-border">
        <div className="container mx-auto px-4 py-20 text-center max-w-3xl">
          <motion.div initial="hidden" animate="visible" variants={fadeInUp} className="space-y-6">
            <div className="w-16 h-16 mx-auto bg-primary/10 text-primary rounded-full flex items-center justify-center mb-4">
              <HelpCircle size={28} />
            </div>
            <h1 className="text-4xl md:text-6xl font-serif">Frequently Asked Questions</h1>
          </motion.div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-16 max-w-3xl space-y-12">
        {faqGroups.map((group) => (
          <motion.div key={group.section} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeInUp}>
            <h2 className="text-2xl font-serif mb-4">{group.section}</h2>
            <Accordion type="single" collapsible className="w-full">
              {group.items.map((item, i) => (
                <AccordionItem key={item.question} value={`${group.section}-${i}`}>
                  <AccordionTrigger className="text-left">{item.question}</AccordionTrigger>
                  <AccordionContent className="text-foreground/70 leading-relaxed">{item.answer}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </motion.div>
        ))}
      </div>
    </Layout>
  );
}
