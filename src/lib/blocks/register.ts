// Registers all built-in blocks into the registry. Import this once (in the
// BlockRenderer) so every block type is available for rendering + editing.

import { registerBlock } from '@/lib/blocks/registry'
import {
  HeroSchema,
  RichTextSchema,
  ProductGridSchema,
  BannerCarouselSchema,
  FaqSchema,
  TestimonialsSchema,
  ContactFormSchema,
  SpacerSchema,
  HtmlEmbedSchema,
} from '@/lib/blocks/registry'
import { HeroBlock } from '@/components/blocks/Hero'
import { RichTextBlock } from '@/components/blocks/RichText'
import { ProductGridBlock } from '@/components/blocks/ProductGrid'
import { BannerCarouselBlock } from '@/components/blocks/BannerCarousel'
import { FaqBlock } from '@/components/blocks/Faq'
import { TestimonialsBlock } from '@/components/blocks/Testimonials'
import { ContactFormBlock } from '@/components/blocks/ContactForm'
import { SpacerBlock } from '@/components/blocks/Spacer'
import { HtmlEmbedBlock } from '@/components/blocks/HtmlEmbed'

let registered = false
export function ensureBlocksRegistered() {
  if (registered) return
  registered = true
  registerBlock({
    type: 'hero',
    label: 'Hero Banner',
    description: 'Large promotional banner with title, subtitle and CTA.',
    icon: 'Image',
    component: HeroBlock,
    schema: HeroSchema,
    defaultProps: {
      title: 'Big Season Sale',
      subtitle: 'Up to 40% off top brands.',
      ctaText: 'Shop Now',
      ctaHref: '#/',
      hue: 210,
    },
  })
  registerBlock({
    type: 'richtext',
    label: 'Rich Text (Markdown)',
    description: 'Markdown-formatted text block.',
    icon: 'Type',
    component: RichTextBlock,
    schema: RichTextSchema,
    defaultProps: { content: '## Heading\n\nYour text here...' },
  })
  registerBlock({
    type: 'product_grid',
    label: 'Product Grid',
    description: 'Live product grid filtered by tag or category.',
    icon: 'LayoutGrid',
    component: ProductGridBlock,
    schema: ProductGridSchema,
    defaultProps: { title: 'Featured Products', tag: 'featured', limit: 8 },
  })
  registerBlock({
    type: 'banner_carousel',
    label: 'Banner Carousel',
    description: 'Auto-rotating carousel of active banners.',
    icon: 'GalleryHorizontal',
    component: BannerCarouselBlock,
    schema: BannerCarouselSchema,
    defaultProps: { autoplay: true },
  })
  registerBlock({
    type: 'faq',
    label: 'FAQ Accordion',
    description: 'Collapsible frequently-asked-questions list.',
    icon: 'HelpCircle',
    component: FaqBlock,
    schema: FaqSchema,
    defaultProps: {
      items: [
        { q: 'How long does delivery take?', a: 'Dhaka: 24-48 hours. Other districts: 2-5 days.' },
        { q: 'What payment methods?', a: 'COD, bKash, Nagad, Rocket, SSLCommerz cards.' },
      ],
    },
  })
  registerBlock({
    type: 'testimonials',
    label: 'Testimonials',
    description: 'Customer review cards.',
    icon: 'MessageSquareQuote',
    component: TestimonialsBlock,
    schema: TestimonialsSchema,
    defaultProps: {
      items: [
        { name: 'Rahim', role: 'Dhaka', text: 'Great service!' },
      ],
    },
  })
  registerBlock({
    type: 'contact_form',
    label: 'Contact Form',
    description: 'Contact form with business details.',
    icon: 'Mail',
    component: ContactFormBlock,
    schema: ContactFormSchema,
    defaultProps: { title: 'Contact Us', email: 'support@bdshop.com' },
  })
  registerBlock({
    type: 'spacer',
    label: 'Spacer',
    description: 'Empty vertical space.',
    icon: 'StretchVertical',
    component: SpacerBlock,
    schema: SpacerSchema,
    defaultProps: { height: 32 },
  })
  registerBlock({
    type: 'html_embed',
    label: 'HTML Embed',
    description: 'Raw HTML embed — the WordPress shortcode equivalent.',
    icon: 'Code',
    component: HtmlEmbedBlock,
    schema: HtmlEmbedSchema,
    defaultProps: { html: '<div class="p-4 bg-amber-50 rounded text-sm">Embedded content</div>' },
  })
}
