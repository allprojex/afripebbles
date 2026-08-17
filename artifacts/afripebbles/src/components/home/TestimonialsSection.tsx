import { motion } from "framer-motion";
import { Quote } from "lucide-react";
import { useListTestimonials } from "@workspace/api-client-react";

const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
};

/**
 * Renders nothing when there are zero published testimonials — a marketing
 * homepage should never show an empty-state placeholder asserting an
 * absence, and testimonials are never seeded/faked to fill the gap.
 */
export function TestimonialsSection() {
  const { data: testimonials } = useListTestimonials();

  if (!testimonials || testimonials.length === 0) return null;

  return (
    <section className="py-24 bg-background">
      <div className="container mx-auto px-4 max-w-5xl">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeInUp} className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-serif mb-3">What people are saying</h2>
        </motion.div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {testimonials.map((testimonial) => (
            <motion.div
              key={testimonial.id}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeInUp}
              className="bg-muted/30 border border-border rounded-2xl p-8 flex flex-col"
            >
              <Quote className="w-6 h-6 text-primary/40 mb-4" />
              <p className="text-foreground/80 leading-relaxed mb-6 flex-1">&ldquo;{testimonial.testimonialText}&rdquo;</p>
              <div className="flex items-center gap-3">
                {testimonial.imageUrl && (
                  <img src={testimonial.imageUrl} alt={testimonial.displayName} className="w-10 h-10 rounded-full object-cover" />
                )}
                <div>
                  <p className="font-medium text-sm">{testimonial.displayName}</p>
                  {testimonial.roleCompany && <p className="text-xs text-foreground/50">{testimonial.roleCompany}</p>}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
