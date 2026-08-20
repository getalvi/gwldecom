'use client';

import React, { useEffect, useState } from 'react';
import {
  MapPin,
  Phone,
  Mail,
  Facebook,
  Twitter,
  Instagram,
  Youtube,
  Send,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { useNavigationStore } from '@/lib/store';
import { APP_NAME } from '@/lib/constants';
import { toast } from '@/hooks/use-toast';

interface StoreSettings {
  store_name?: string;
  store_email?: string;
  store_phone?: string;
  store_address?: string;
  facebook_url?: string;
  twitter_url?: string;
  instagram_url?: string;
  youtube_url?: string;
}

const FALLBACK_SETTINGS: StoreSettings = {
  store_name: APP_NAME,
  store_email: 'support@shopnova.com',
  store_phone: '+880 1700-000000',
  store_address: 'Gulshan-2, Dhaka 1212, Bangladesh',
  facebook_url: 'https://facebook.com/shopnova',
  twitter_url: 'https://twitter.com/shopnova',
  instagram_url: 'https://instagram.com/shopnova',
  youtube_url: 'https://youtube.com/@shopnova',
};

export default function Footer() {
  const [settings, setSettings] = useState<StoreSettings>(FALLBACK_SETTINGS);
  const [email, setEmail] = useState('');
  const navigate = useNavigationStore((s) => s.navigate);

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((data) => {
        if (data && typeof data === 'object') {
          setSettings({ ...FALLBACK_SETTINGS, ...data });
        }
      })
      .catch(() => {});
  }, []);

  const handleNewsletter = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    toast({
      title: 'Subscribed!',
      description: 'You have been subscribed to our newsletter.',
    });
    setEmail('');
  };

  const quickLinks = [
    { label: 'Shop All', view: 'shop' },
    { label: 'New Arrivals', view: 'shop', params: { sort: 'newest' } },
    { label: 'Best Sellers', view: 'shop', params: { sort: 'popular' } },
    { label: 'Deals & Offers', view: 'shop', params: { featured: 'true' } },
    { label: 'Categories', view: 'categories' },
  ];

  const customerLinks = [
    { label: 'My Account', view: 'account' },
    { label: 'Order Tracking', view: 'account/orders' },
    { label: 'Shipping Policy', view: 'page', params: { slug: 'shipping-policy' } },
    { label: 'Return Policy', view: 'page', params: { slug: 'return-policy' } },
    { label: 'FAQ', view: 'page', params: { slug: 'faq' } },
  ];

  return (
    <footer className="bg-gray-900 text-gray-300">
      {/* Newsletter Bar */}
      <div className="bg-primary/10 border-b border-gray-800">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="text-white font-semibold text-lg">Subscribe to our Newsletter</h3>
              <p className="text-gray-400 text-sm mt-1">
                Get the latest deals and updates delivered to your inbox.
              </p>
            </div>
            <form onSubmit={handleNewsletter} className="flex w-full md:w-auto gap-2">
              <Input
                type="email"
                placeholder="Your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 w-full md:w-64"
              />
              <Button type="submit" className="shrink-0">
                <Send className="h-4 w-4 mr-2" />
                Subscribe
              </Button>
            </form>
          </div>
        </div>
      </div>

      {/* Main Footer */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* About */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">S</span>
              </div>
              <span className="font-bold text-xl text-white">{settings.store_name}</span>
            </div>
            <p className="text-sm text-gray-400 leading-relaxed mb-4">
              Your one-stop destination for premium products at amazing prices. Shop with confidence on {settings.store_name}.
            </p>
            <div className="flex gap-3">
              {settings.facebook_url && (
                <a href={settings.facebook_url} target="_blank" rel="noopener noreferrer" className="h-9 w-9 rounded-full bg-gray-800 flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors">
                  <Facebook className="h-4 w-4" />
                </a>
              )}
              {settings.twitter_url && (
                <a href={settings.twitter_url} target="_blank" rel="noopener noreferrer" className="h-9 w-9 rounded-full bg-gray-800 flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors">
                  <Twitter className="h-4 w-4" />
                </a>
              )}
              {settings.instagram_url && (
                <a href={settings.instagram_url} target="_blank" rel="noopener noreferrer" className="h-9 w-9 rounded-full bg-gray-800 flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors">
                  <Instagram className="h-4 w-4" />
                </a>
              )}
              {settings.youtube_url && (
                <a href={settings.youtube_url} target="_blank" rel="noopener noreferrer" className="h-9 w-9 rounded-full bg-gray-800 flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors">
                  <Youtube className="h-4 w-4" />
                </a>
              )}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-white font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2.5">
              {quickLinks.map((link) => (
                <li key={link.label}>
                  <button
                    onClick={() => navigate(link.view, link.params)}
                    className="text-sm text-gray-400 hover:text-white transition-colors"
                  >
                    {link.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Customer Service */}
          <div>
            <h4 className="text-white font-semibold mb-4">Customer Service</h4>
            <ul className="space-y-2.5">
              {customerLinks.map((link) => (
                <li key={link.label}>
                  <button
                    onClick={() => navigate(link.view, link.params)}
                    className="text-sm text-gray-400 hover:text-white transition-colors"
                  >
                    {link.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-white font-semibold mb-4">Contact Us</h4>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <MapPin className="h-4 w-4 mt-0.5 shrink-0 text-gray-500" />
                <span className="text-sm text-gray-400">{settings.store_address}</span>
              </li>
              <li className="flex items-center gap-3">
                <Phone className="h-4 w-4 shrink-0 text-gray-500" />
                <a href={`tel:${settings.store_phone}`} className="text-sm text-gray-400 hover:text-white transition-colors">
                  {settings.store_phone}
                </a>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="h-4 w-4 shrink-0 text-gray-500" />
                <a href={`mailto:${settings.store_email}`} className="text-sm text-gray-400 hover:text-white transition-colors">
                  {settings.store_email}
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Copyright */}
      <Separator className="bg-gray-800" />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-gray-500">
          <p>© {new Date().getFullYear()} {settings.store_name}. All rights reserved.</p>
          <div className="flex gap-4">
            <button onClick={() => navigate('page', { slug: 'privacy-policy' })} className="hover:text-white transition-colors">
              Privacy Policy
            </button>
            <button onClick={() => navigate('page', { slug: 'terms' })} className="hover:text-white transition-colors">
              Terms of Service
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
