'use client';

import { useState } from 'react';
import { useTenant } from '@/hooks/use-tenant';
import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Languages, Plus, GripVertical, Trash2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';

const allLanguages = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'sv', name: 'Svenska', flag: '🇸🇪' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'ar', name: 'العربية', flag: '🇸🇦' },
  { code: 'ja', name: '日本語', flag: '🇯🇵' },
  { code: 'zh', name: '中文', flag: '🇨🇳' },
  { code: 'pt', name: 'Português', flag: '🇧🇷' },
  { code: 'it', name: 'Italiano', flag: '🇮🇹' },
  { code: 'nl', name: 'Nederlands', flag: '🇳🇱' },
  { code: 'ko', name: '한국어', flag: '🇰🇷' }
];

interface EnabledLang {
  code: string;
  name: string;
  flag: string;
  autoTranslate: boolean;
  primary: boolean;
}

export default function WorkspaceMultilingualClient() {
  const { loading } = useTenant();
  const [enabledLanguages, setEnabledLanguages] = useState<EnabledLang[]>([
    {
      code: 'en',
      name: 'English',
      flag: '🇬🇧',
      autoTranslate: false,
      primary: true
    },
    {
      code: 'sv',
      name: 'Svenska',
      flag: '🇸🇪',
      autoTranslate: true,
      primary: false
    }
  ]);
  const [autoDetect, setAutoDetect] = useState(true);

  if (loading) {
    return (
      <div className='flex items-center justify-center py-20'>
        <Icons.spinner className='text-muted-foreground h-8 w-8 animate-spin' />
      </div>
    );
  }

  const availableToAdd = allLanguages.filter(
    (l) => !enabledLanguages.find((e) => e.code === l.code)
  );

  const addLanguage = (code: string) => {
    const lang = allLanguages.find((l) => l.code === code);
    if (lang) {
      setEnabledLanguages((prev) => [
        ...prev,
        { ...lang, autoTranslate: true, primary: false }
      ]);
    }
  };

  const removeLanguage = (code: string) => {
    setEnabledLanguages((prev) => prev.filter((l) => l.code !== code));
  };

  const toggleTranslate = (code: string) => {
    setEnabledLanguages((prev) =>
      prev.map((l) =>
        l.code === code ? { ...l, autoTranslate: !l.autoTranslate } : l
      )
    );
  };

  return (
    <div className='space-y-6'>
      <div>
        <h2 className='text-2xl font-bold tracking-tight'>Multilingual</h2>
        <p className='text-muted-foreground'>
          Configure supported languages and translations
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2 text-base'>
            <Languages className='h-4 w-4' />
            Language Detection
          </CardTitle>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='flex items-center justify-between'>
            <div>
              <p className='text-sm font-medium'>Auto-detect language</p>
              <p className='text-muted-foreground text-xs'>
                Automatically detect customer&apos;s language and respond
                accordingly
              </p>
            </div>
            <Switch checked={autoDetect} onCheckedChange={setAutoDetect} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className='flex items-center justify-between'>
            <div>
              <CardTitle className='text-base'>Enabled Languages</CardTitle>
              <CardDescription>
                Languages your AI assistant can respond in
              </CardDescription>
            </div>
            {availableToAdd.length > 0 && (
              <Select onValueChange={addLanguage}>
                <SelectTrigger className='w-44'>
                  <Plus className='mr-1 h-4 w-4' />
                  <SelectValue placeholder='Add language' />
                </SelectTrigger>
                <SelectContent>
                  {availableToAdd.map((lang) => (
                    <SelectItem key={lang.code} value={lang.code}>
                      {lang.flag} {lang.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </CardHeader>
        <CardContent className='space-y-1'>
          {enabledLanguages.map((lang, i) => (
            <div key={lang.code}>
              <div className='flex items-center justify-between py-3'>
                <div className='flex items-center gap-3'>
                  <GripVertical className='text-muted-foreground h-4 w-4 cursor-grab' />
                  <span className='text-lg'>{lang.flag}</span>
                  <div>
                    <p className='text-sm font-medium'>
                      {lang.name}
                      {lang.primary && (
                        <Badge variant='outline' className='ml-2'>
                          Primary
                        </Badge>
                      )}
                    </p>
                    <p className='text-muted-foreground text-xs'>
                      {lang.code.toUpperCase()}
                    </p>
                  </div>
                </div>
                <div className='flex items-center gap-3'>
                  <div className='flex items-center gap-2'>
                    <span className='text-muted-foreground text-xs'>
                      Auto-translate
                    </span>
                    <Switch
                      checked={lang.autoTranslate}
                      onCheckedChange={() => toggleTranslate(lang.code)}
                      disabled={lang.primary}
                    />
                  </div>
                  {!lang.primary && (
                    <Button
                      variant='ghost'
                      size='sm'
                      onClick={() => removeLanguage(lang.code)}
                    >
                      <Trash2 className='text-destructive h-4 w-4' />
                    </Button>
                  )}
                </div>
              </div>
              {i < enabledLanguages.length - 1 && <Separator />}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className='text-base'>Translation Quality</CardTitle>
          <CardDescription>How AI translations are handled</CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='space-y-2'>
            <p className='text-sm font-medium'>Translation engine</p>
            <Select defaultValue='ai'>
              <SelectTrigger className='w-64'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='ai'>AI (LLM-based)</SelectItem>
                <SelectItem value='google'>Google Translate</SelectItem>
                <SelectItem value='deepl'>DeepL</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Separator />
          <div className='space-y-2'>
            <p className='text-sm font-medium'>Knowledge base translations</p>
            <p className='text-muted-foreground text-xs'>
              Auto-translate knowledge articles into enabled languages for
              better retrieval accuracy
            </p>
            <Button
              variant='outline'
              size='sm'
              onClick={() =>
                toast.success('Translation job started for 2 languages')
              }
            >
              Translate All Articles
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className='flex justify-end'>
        <Button onClick={() => toast.success('Multilingual settings saved')}>
          Save Changes
        </Button>
      </div>
    </div>
  );
}
