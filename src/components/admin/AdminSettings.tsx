'use client';

import React, { useEffect, useState } from 'react';
import { Save, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

interface SettingsData {
  [key: string]: string;
}

const SETTINGS_SCHEMA: Record<string, Record<string, { label: string; type: 'text' | 'textarea' | 'number' | 'switch' | 'url' }>> = {
  General: {
    store_name: { label: 'Store Name', type: 'text' },
    store_tagline: { label: 'Store Tagline', type: 'text' },
    currency: { label: 'Currency Code', type: 'text' },
    currency_symbol: { label: 'Currency Symbol', type: 'text' },
    logo_url: { label: 'Logo URL', type: 'url' },
    favicon_url: { label: 'Favicon URL', type: 'url' },
  },
  Contact: {
    store_email: { label: 'Store Email', type: 'text' },
    store_phone: { label: 'Store Phone', type: 'text' },
    store_address: { label: 'Store Address', type: 'textarea' },
  },
  Social: {
    social_facebook: { label: 'Facebook URL', type: 'url' },
    social_instagram: { label: 'Instagram URL', type: 'url' },
    social_youtube: { label: 'YouTube URL', type: 'url' },
    social_twitter: { label: 'Twitter / X URL', type: 'url' },
    social_linkedin: { label: 'LinkedIn URL', type: 'url' },
  },
  Shipping: {
    free_shipping_above: { label: 'Free Shipping Above', type: 'number' },
    default_shipping_fee: { label: 'Default Shipping Fee', type: 'number' },
  },
  Tax: {
    tax_enabled: { label: 'Enable Tax', type: 'switch' },
    tax_rate: { label: 'Tax Rate (%)', type: 'number' },
  },
  AI: {
    ai_assistant_enabled: { label: 'AI Assistant Enabled', type: 'switch' },
    ai_assistant_name: { label: 'AI Assistant Name', type: 'text' },
    ai_assistant_greeting: { label: 'AI Assistant Greeting', type: 'textarea' },
  },
  SEO: {
    seo_default_title: { label: 'Default Meta Title', type: 'text' },
    seo_default_description: { label: 'Default Meta Description', type: 'textarea' },
  },
};

export default function AdminSettings() {
  const [settings, setSettings] = useState<SettingsData>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      // API returns array of {key, value} or object
      if (Array.isArray(data)) {
        const obj: SettingsData = {};
        data.forEach((s: { key: string; value: string }) => { obj[s.key] = s.value; });
        setSettings(obj);
      } else if (data && typeof data === 'object') {
        setSettings(data);
      }
    } catch {
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSettings(); }, []);

  const updateValue = (key: string, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      if (res.ok) {
        toast.success('Settings saved');
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to save');
      }
    } catch {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    );
  }

  const renderField = (key: string, schema: { label: string; type: string }) => {
    const value = settings[key] || '';

    if (schema.type === 'switch') {
      return (
        <div className="flex items-center justify-between">
          <Label>{schema.label}</Label>
          <Switch
            checked={value === 'true' || value === '1'}
            onCheckedChange={(checked) => updateValue(key, String(checked))}
          />
        </div>
      );
    }

    if (schema.type === 'textarea') {
      return (
        <div>
          <Label>{schema.label}</Label>
          <Textarea value={value} onChange={(e) => updateValue(key, e.target.value)} className="mt-1.5" rows={3} />
        </div>
      );
    }

    return (
      <div>
        <Label>{schema.label}</Label>
        <Input
          type={schema.type === 'number' ? 'number' : 'text'}
          step={schema.type === 'number' ? '0.01' : undefined}
          value={value}
          onChange={(e) => updateValue(key, e.target.value)}
          className="mt-1.5"
        />
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div />
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-2" /> {saving ? 'Saving...' : 'Save All Settings'}
        </Button>
      </div>

      <Tabs defaultValue="General">
        <TabsList className="flex-wrap h-auto gap-1 bg-gray-100 p-1">
          {Object.keys(SETTINGS_SCHEMA).map((tab) => (
            <TabsTrigger key={tab} value={tab} className="text-sm data-[state=active]:bg-white">
              {tab}
            </TabsTrigger>
          ))}
        </TabsList>

        {Object.entries(SETTINGS_SCHEMA).map(([tab, fields]) => (
          <TabsContent key={tab} value={tab}>
            <div className="rounded-xl border bg-white p-6 space-y-4">
              {Object.entries(fields).map(([key, schema]) => (
                <React.Fragment key={key}>{renderField(key, schema)}</React.Fragment>
              ))}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
