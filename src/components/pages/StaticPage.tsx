'use client';

import React, { useEffect, useState, useReducer, FormEvent } from 'react';
import {
  Phone,
  Mail,
  MapPin,
  Clock,
  Send,
  AlertCircle,
  Package,
  CreditCard,
  Truck,
  RotateCcw,
  ShieldCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import PageHeader from '@/components/shared/PageHeader';
import LoadingState from '@/components/shared/LoadingState';
import { useNavigationStore } from '@/lib/store';
import { toast } from 'sonner';

interface CmsPageData {
  title: string;
  slug: string;
  content: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
}

// ─── Hardcoded Fallback Content ────────────────────────────

const FALLBACK_PAGES: Record<string, { title: string; content: string }> = {
  about: {
    title: 'About ShopNova',
    content: `ShopNova is a leading online shopping destination in Bangladesh, dedicated to bringing you the best products at the most competitive prices. Founded with a vision to make quality products accessible to everyone, we have grown into a trusted marketplace that serves thousands of happy customers across the country.

Our carefully curated selection spans across electronics, fashion, home & living, and beauty products. We partner directly with brands and authorized distributors to ensure every product you purchase from us is 100% authentic and comes with full warranty coverage. Our team of experts rigorously tests and verifies each product before it makes it to our shelves.

At ShopNova, customer satisfaction is at the heart of everything we do. From our user-friendly website and mobile-first design to our lightning-fast delivery and responsive customer support, every aspect of your shopping experience has been thoughtfully crafted. We believe in transparent pricing, hassle-free returns, and building lasting relationships with our customers.`,
  },
  contact: {
    title: 'Contact Us',
    content: `We'd love to hear from you! Whether you have a question about our products, need help with an order, or just want to say hello, our team is here to help.

You can reach us through the contact form below, or use any of the following methods:

Email: support@shopnova.com.bd
Phone: +880 1700-000000
Address: House 42, Road 7, Dhanmondi, Dhaka 1205, Bangladesh
Business Hours: Saturday - Thursday, 10:00 AM - 8:00 PM

We typically respond to all inquiries within 24 hours during business days.`,
  },
  help: {
    title: 'Help Center',
    content: `Welcome to the ShopNova Help Center! Here you'll find answers to the most common questions and issues. Browse the topics below or use the search bar to find exactly what you need.

Ordering & Payment: Learn how to place an order, available payment methods, and how to apply coupon codes.

Shipping & Delivery: Find information about shipping zones, delivery times, tracking your order, and shipping fees.

Returns & Refunds: Understand our return policy, how to initiate a return, and refund processing times.

Account & Security: Manage your account settings, update your profile, and learn about our security measures.

Product Information: Get details about product warranties, authenticity guarantees, and how to choose the right product.

If you can't find the answer you're looking for, please don't hesitate to contact our support team.`,
  },
  'shipping-policy': {
    title: 'Shipping Policy',
    content: `ShopNova ships to all 64 districts in Bangladesh. We partner with trusted courier services to ensure your orders reach you safely and on time.

Shipping Methods:
• Inside Dhaka: ৳60 — Estimated delivery in 1-2 business days
• Standard Delivery (Outside Dhaka): ৳120 — Estimated delivery in 3-5 business days
• Express Delivery: ৳250 — Estimated delivery in 1-2 business days (available in select areas)

Free Shipping: Orders above ৳5,000 qualify for free standard shipping across Bangladesh.

Order Processing: Orders placed before 2:00 PM (BST) on business days are typically processed and handed over to our courier partners the same day. Orders placed after 2:00 PM or on holidays are processed the next business day.

Tracking: Once your order is shipped, you'll receive an SMS and email with a tracking number. You can also track your order from your account dashboard.

Delivery Issues: If you experience any delivery issues, please contact our support team within 48 hours of the expected delivery date.`,
  },
  'return-policy': {
    title: 'Return & Refund Policy',
    content: `At ShopNova, we want you to be completely satisfied with your purchase. If for any reason you're not happy, we offer a hassle-free return process.

Return Window: You may request a return within 7 days of receiving your order. Items must be unused, in their original packaging, and with all tags and accessories intact.

Non-Returnable Items: Personal care products, intimate items, perishable goods, and customized products cannot be returned due to hygiene and safety reasons.

How to Return:
1. Go to your Order Details page in your account
2. Click "Request Return" and select the items you wish to return
3. Provide a reason for the return and upload photos if applicable
4. Our team will review your request within 24 hours
5. Once approved, our courier will pick up the item from your address

Refund Process: After we receive and inspect the returned item, your refund will be processed within 3-5 business days. Refunds are issued to your original payment method. For Cash on Delivery orders, refunds are processed via bank transfer or mobile banking.

Exchange: We currently do not offer direct exchanges. Please return the item and place a new order for the desired product.

Damaged or Defective Items: If you receive a damaged or defective item, please contact us within 48 hours with photos. We'll arrange a free return and full refund or replacement.`,
  },
  'privacy-policy': {
    title: 'Privacy Policy',
    content: `ShopNova ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard your personal information when you visit our website and make purchases.

Information We Collect:
• Personal information: name, email address, phone number, shipping address
• Payment information: payment method details (processed securely by our payment partners)
• Account data: order history, wishlist, reviews
• Technical data: IP address, browser type, device information, cookies

How We Use Your Information:
• To process and fulfill your orders
• To communicate about your orders and provide customer support
• To personalize your shopping experience and show relevant products
• To send promotional emails and offers (with your consent)
• To improve our website, products, and services
• To prevent fraud and ensure security

Data Sharing: We do not sell your personal information to third parties. We may share your data with trusted partners who help us operate our business (courier services, payment processors) only as needed to provide our services.

Cookies: We use cookies and similar technologies to enhance your browsing experience, analyze site traffic, and understand user behavior. You can manage your cookie preferences through your browser settings.

Data Security: We implement industry-standard security measures including SSL encryption, secure payment processing, and regular security audits to protect your data.

Your Rights: You have the right to access, correct, or delete your personal data. You can manage your data through your account settings or by contacting our support team.

Updates: We may update this Privacy Policy from time to time. We will notify you of any significant changes via email or through our website.

Contact: For any privacy-related questions, please contact us at privacy@shopnova.com.bd.`,
  },
  terms: {
    title: 'Terms & Conditions',
    content: `These Terms and Conditions ("Terms") govern your use of the ShopNova website and services. By accessing or using our website, you agree to be bound by these Terms.

Account Registration: You must be at least 18 years old to create an account. You are responsible for maintaining the confidentiality of your account credentials and for all activities under your account.

Products & Pricing: All product descriptions, images, and prices are subject to change without notice. We make every effort to ensure accuracy, but we do not guarantee that all information is error-free. Prices are displayed in Bangladeshi Taka (BDT) and include applicable taxes unless stated otherwise.

Orders: Placing an order constitutes an offer to purchase. We reserve the right to accept or decline any order. An order is confirmed only when you receive a confirmation from us. We reserve the right to limit order quantities and cancel orders that violate our policies.

Payment: We accept Cash on Delivery (COD), bKash, Nagad, Rocket, SSLCommerz, and major credit/debit cards. All payments are processed securely through our payment partners.

Intellectual Property: All content on this website, including text, graphics, logos, and images, is the property of ShopNova or its content suppliers and is protected by intellectual property laws.

Prohibited Activities: You may not use our website for any unlawful purpose, attempt to gain unauthorized access, or interfere with the proper functioning of the site.

Limitation of Liability: ShopNova shall not be liable for any indirect, incidental, or consequential damages arising from your use of our services. Our total liability shall not exceed the amount paid by you for the relevant order.

Governing Law: These Terms are governed by the laws of Bangladesh. Any disputes shall be resolved through arbitration in Dhaka, Bangladesh.

Changes: We reserve the right to modify these Terms at any time. Continued use of our services after changes constitutes acceptance of the updated Terms.`,
  },
};

const FAQ_DATA = [
  {
    question: 'How long does delivery take?',
    answer: 'Inside Dhaka delivery takes 1-2 business days. Outside Dhaka, standard delivery takes 3-5 business days. Express delivery (available in select areas) takes 1-2 business days.',
  },
  {
    question: 'What payment methods do you accept?',
    answer: 'We accept Cash on Delivery (COD), bKash, Nagad, Rocket, SSLCommerz, and major credit/debit cards (Visa, Mastercard).',
  },
  {
    question: 'Can I return or exchange a product?',
    answer: 'Yes! You can request a return within 7 days of receiving your order. Items must be unused, in original packaging, with all tags intact. Please visit your order details page to initiate a return.',
  },
  {
    question: 'How do I track my order?',
    answer: 'Once your order is shipped, you\'ll receive an SMS and email with a tracking number. You can also track your order from your account dashboard under "My Orders".',
  },
  {
    question: 'Do you offer Cash on Delivery (COD)?',
    answer: 'Yes, Cash on Delivery is available for all orders across Bangladesh. Please keep the exact change ready for a smooth delivery experience.',
  },
  {
    question: 'How can I contact customer support?',
    answer: 'You can reach us via email at support@shopnova.com.bd, by phone at +880 1700-000000, or through the contact form on our website. Our team is available Saturday-Thursday, 10 AM - 8 PM.',
  },
  {
    question: 'Are the products authentic?',
    answer: 'Absolutely! We partner directly with brands and authorized distributors. Every product comes with authenticity verification and full warranty coverage. We have a zero-tolerance policy for counterfeit products.',
  },
  {
    question: 'Can I cancel my order?',
    answer: 'You can cancel your order before it is shipped. Go to your order details and click "Cancel Order". Once an order has been shipped, cancellation is not possible — you can request a return after delivery instead.',
  },
];

const HELP_TOPICS = [
  { icon: Package, title: 'Ordering', description: 'Placing orders, modifying, canceling' },
  { icon: CreditCard, title: 'Payment', description: 'Payment methods, coupons, invoices' },
  { icon: Truck, title: 'Shipping', description: 'Delivery times, tracking, zones' },
  { icon: RotateCcw, title: 'Returns', description: 'Return policy, refunds, exchanges' },
  { icon: ShieldCheck, title: 'Security', description: 'Account safety, data protection' },
];

// ─── Contact Form Component ───────────────────────────────

function ContactForm() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    // Simulate submission
    setTimeout(() => {
      setSubmitting(false);
      setFormData({ name: '', email: '', subject: '', message: '' });
      toast.success('Message sent!', { description: 'We\'ll get back to you within 24 hours.' });
    }, 1000);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="contact-name">Name</Label>
          <Input
            id="contact-name"
            placeholder="Your name"
            value={formData.name}
            onChange={(e) => setFormData((f) => ({ ...f, name: e.target.value }))}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="contact-email">Email</Label>
          <Input
            id="contact-email"
            type="email"
            placeholder="you@example.com"
            value={formData.email}
            onChange={(e) => setFormData((f) => ({ ...f, email: e.target.value }))}
            required
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="contact-subject">Subject</Label>
        <Input
          id="contact-subject"
          placeholder="What is this about?"
          value={formData.subject}
          onChange={(e) => setFormData((f) => ({ ...f, subject: e.target.value }))}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="contact-message">Message</Label>
        <Textarea
          id="contact-message"
          placeholder="Tell us more about your inquiry..."
          rows={5}
          value={formData.message}
          onChange={(e) => setFormData((f) => ({ ...f, message: e.target.value }))}
          required
        />
      </div>
      <Button
        type="submit"
        disabled={submitting}
        className="bg-emerald-600 hover:bg-emerald-700 text-white"
      >
        {submitting ? 'Sending...' : 'Send Message'}
        <Send className="h-4 w-4 ml-2" />
      </Button>
    </form>
  );
}

// ─── Contact Info Sidebar ─────────────────────────────────

function ContactInfo() {
  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
          <Mail className="h-5 w-5 text-emerald-600" />
        </div>
        <div>
          <p className="text-sm font-medium text-gray-900">Email</p>
          <p className="text-sm text-gray-500">support@shopnova.com.bd</p>
        </div>
      </div>
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
          <Phone className="h-5 w-5 text-emerald-600" />
        </div>
        <div>
          <p className="text-sm font-medium text-gray-900">Phone</p>
          <p className="text-sm text-gray-500">+880 1700-000000</p>
        </div>
      </div>
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
          <MapPin className="h-5 w-5 text-emerald-600" />
        </div>
        <div>
          <p className="text-sm font-medium text-gray-900">Address</p>
          <p className="text-sm text-gray-500">House 42, Road 7, Dhanmondi<br />Dhaka 1205, Bangladesh</p>
        </div>
      </div>
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
          <Clock className="h-5 w-5 text-emerald-600" />
        </div>
        <div>
          <p className="text-sm font-medium text-gray-900">Business Hours</p>
          <p className="text-sm text-gray-500">Sat - Thu: 10:00 AM - 8:00 PM</p>
        </div>
      </div>
    </div>
  );
}

// ─── Main StaticPage Component ────────────────────────────

interface PageState {
  pageData: CmsPageData | null;
  loading: boolean;
  notFound: boolean;
}

type PageAction =
  | { type: 'FETCH_START' }
  | { type: 'FETCH_SUCCESS'; data: CmsPageData }
  | { type: 'FETCH_FALLBACK'; data: CmsPageData }
  | { type: 'FETCH_NOT_FOUND' };

function pageReducer(state: PageState, action: PageAction): PageState {
  switch (action.type) {
    case 'FETCH_START':
      return { pageData: null, loading: true, notFound: false };
    case 'FETCH_SUCCESS':
      return { pageData: action.data, loading: false, notFound: false };
    case 'FETCH_FALLBACK':
      return { pageData: action.data, loading: false, notFound: false };
    case 'FETCH_NOT_FOUND':
      return { pageData: null, loading: false, notFound: true };
  }
}

export default function StaticPage() {
  const viewParams = useNavigationStore((s) => s.viewParams);
  const slug = viewParams.slug || '';

  const [state, dispatch] = useReducer(pageReducer, {
    pageData: null,
    loading: true,
    notFound: false,
  });

  useEffect(() => {
    let cancelled = false;
    dispatch({ type: 'FETCH_START' });

    const load = async () => {
      try {
        const r = await fetch(`/api/cms/${slug}`);
        if (cancelled) return;

        if (r.status === 404) {
          if (FALLBACK_PAGES[slug]) {
            dispatch({
              type: 'FETCH_FALLBACK',
              data: {
                title: FALLBACK_PAGES[slug].title,
                slug,
                content: FALLBACK_PAGES[slug].content,
                seoTitle: null,
                seoDescription: null,
              },
            });
          } else {
            dispatch({ type: 'FETCH_NOT_FOUND' });
          }
          return;
        }

        const data = await r.json();
        if (cancelled) return;

        if (data?.page) {
          dispatch({ type: 'FETCH_SUCCESS', data: data.page });
        }
      } catch {
        if (cancelled) return;
        if (FALLBACK_PAGES[slug]) {
          dispatch({
            type: 'FETCH_FALLBACK',
            data: {
              title: FALLBACK_PAGES[slug].title,
              slug,
              content: FALLBACK_PAGES[slug].content,
              seoTitle: null,
              seoDescription: null,
            },
          });
        } else {
          dispatch({ type: 'FETCH_NOT_FOUND' });
        }
      }
    };

    load();
    return () => { cancelled = true; };
  }, [slug]);

  const { pageData, loading, notFound } = state;

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <LoadingState type="detail" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
            <AlertCircle className="h-8 w-8 text-gray-400" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Page Not Found</h1>
          <p className="text-gray-500 mb-6 max-w-md">
            The page you&apos;re looking for doesn&apos;t exist or has been moved.
          </p>
          <Button onClick={() => window.location.hash = '#home'} className="bg-emerald-600 hover:bg-emerald-700 text-white">
            Go to Homepage
          </Button>
        </div>
      </div>
    );
  }

  if (!pageData) return null;

  // Render FAQ page
  if (slug === 'faq') {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <PageHeader
          title={pageData.title}
          breadcrumbs={[{ label: pageData.title }]}
        />

        <div className="mt-2">
          <Accordion type="single" collapsible className="w-full">
            {FAQ_DATA.map((faq, index) => (
              <AccordionItem key={index} value={`faq-${index}`}>
                <AccordionTrigger className="text-left text-sm sm:text-base font-medium hover:no-underline">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-gray-600 text-sm leading-relaxed">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    );
  }

  // Render Contact page
  if (slug === 'contact') {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <PageHeader
          title={pageData.title}
          breadcrumbs={[{ label: pageData.title }]}
        />

        <div className="mt-2 grid md:grid-cols-3 gap-8">
          {/* Contact Form */}
          <div className="md:col-span-2">
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Send us a message</h2>
              <ContactForm />
            </div>
          </div>

          {/* Contact Info Sidebar */}
          <div>
            <div className="bg-white border border-gray-200 rounded-xl p-6 sticky top-24">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Get in touch</h2>
              <ContactInfo />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Render Help page
  if (slug === 'help') {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <PageHeader
          title={pageData.title}
          breadcrumbs={[{ label: pageData.title }]}
        />

        {/* Help Topics Grid */}
        <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {HELP_TOPICS.map((topic, index) => {
            const Icon = topic.icon;
            return (
              <div
                key={index}
                className="border border-gray-200 rounded-xl p-5 hover:shadow-md hover:border-gray-300 transition-all cursor-pointer"
                onClick={() => window.location.hash = '#faq'}
              >
                <div className="h-10 w-10 rounded-lg bg-emerald-50 flex items-center justify-center mb-3">
                  <Icon className="h-5 w-5 text-emerald-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">{topic.title}</h3>
                <p className="text-sm text-gray-500">{topic.description}</p>
              </div>
            );
          })}
        </div>

        {/* Help Content */}
        <div className="prose prose-gray max-w-none">
          {pageData.content &&
            pageData.content
              .split('\n\n')
              .filter((p) => p.trim())
              .map((paragraph, index) => (
                <p
                  key={index}
                  className="text-gray-600 leading-relaxed mb-4"
                  style={{ whiteSpace: 'pre-line' }}
                >
                  {paragraph.trim()}
                </p>
              ))}
        </div>
      </div>
    );
  }

  // Render generic page content (about, policies, terms, etc.)
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <PageHeader
        title={pageData.title}
        breadcrumbs={[{ label: pageData.title }]}
      />

      <div className="mt-2">
        {pageData.content &&
          pageData.content
            .split('\n\n')
            .filter((p) => p.trim())
            .map((paragraph, index) => (
              <p
                key={index}
                className="text-gray-600 leading-relaxed mb-4"
                style={{ whiteSpace: 'pre-line' }}
              >
                {paragraph.trim()}
              </p>
            ))}
      </div>
    </div>
  );
}
