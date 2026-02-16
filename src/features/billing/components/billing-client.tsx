'use client';

import { useState } from 'react';
import { useTenant } from '@/hooks/use-tenant';
import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  Building2,
  Check,
  CreditCard,
  Download,
  Eye,
  FileText,
  Globe,
  Landmark,
  Mail,
  Pencil,
  Receipt,
  Save,
  Send,
  Smartphone,
  Wallet
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────

type PaymentMethod = 'e-invoice' | 'gdu' | 'letter' | 'card' | 'bank-transfer';

interface BillingAddress {
  companyName: string;
  orgNumber: string;
  vatNumber: string;
  street: string;
  postalCode: string;
  city: string;
  country: string;
  reference: string;
  email: string;
}

interface Invoice {
  id: string;
  number: string;
  date: string;
  dueDate: string;
  amount: string;
  currency: string;
  status: 'paid' | 'pending' | 'overdue' | 'draft';
  paymentMethod: PaymentMethod;
  pdfUrl?: string;
}

interface SavedPaymentMethod {
  id: string;
  type: PaymentMethod;
  label: string;
  details: string;
  isDefault: boolean;
  addedDate: string;
}

// ── Mock Data ──────────────────────────────────────────────

const defaultAddress: BillingAddress = {
  companyName: 'SWEO AB',
  orgNumber: '559123-4567',
  vatNumber: 'SE559123456701',
  street: 'Kungsgatan 44',
  postalCode: '111 35',
  city: 'Stockholm',
  country: 'Sverige',
  reference: 'Yazan Ghayad',
  email: 'faktura@sweo.ai'
};

const mockInvoices: Invoice[] = [
  {
    id: '1',
    number: 'INV-2026-0024',
    date: '2026-02-01',
    dueDate: '2026-02-28',
    amount: '4 990,00',
    currency: 'SEK',
    status: 'pending',
    paymentMethod: 'e-invoice'
  },
  {
    id: '2',
    number: 'INV-2026-0019',
    date: '2026-01-01',
    dueDate: '2026-01-30',
    amount: '4 990,00',
    currency: 'SEK',
    status: 'paid',
    paymentMethod: 'e-invoice'
  },
  {
    id: '3',
    number: 'INV-2025-0218',
    date: '2025-12-01',
    dueDate: '2025-12-30',
    amount: '4 990,00',
    currency: 'SEK',
    status: 'paid',
    paymentMethod: 'e-invoice'
  },
  {
    id: '4',
    number: 'INV-2025-0195',
    date: '2025-11-01',
    dueDate: '2025-11-30',
    amount: '4 990,00',
    currency: 'SEK',
    status: 'paid',
    paymentMethod: 'card'
  },
  {
    id: '5',
    number: 'INV-2025-0170',
    date: '2025-10-01',
    dueDate: '2025-10-30',
    amount: '4 990,00',
    currency: 'SEK',
    status: 'paid',
    paymentMethod: 'card'
  },
  {
    id: '6',
    number: 'INV-2025-0148',
    date: '2025-09-01',
    dueDate: '2025-09-30',
    amount: '3 990,00',
    currency: 'SEK',
    status: 'paid',
    paymentMethod: 'card'
  },
  {
    id: '7',
    number: 'INV-2025-0122',
    date: '2025-08-01',
    dueDate: '2025-08-30',
    amount: '3 990,00',
    currency: 'SEK',
    status: 'paid',
    paymentMethod: 'letter'
  },
  {
    id: '8',
    number: 'INV-2025-0099',
    date: '2025-07-01',
    dueDate: '2025-07-30',
    amount: '3 990,00',
    currency: 'SEK',
    status: 'paid',
    paymentMethod: 'letter'
  }
];

const savedPaymentMethods: SavedPaymentMethod[] = [
  {
    id: '1',
    type: 'e-invoice',
    label: 'E-faktura',
    details: 'GLN: 7312345678901 — SWEO AB',
    isDefault: true,
    addedDate: '2025-10-15'
  },
  {
    id: '2',
    type: 'card',
    label: 'Visa ****4242',
    details: 'Utgår 12/2027 — Yazan Ghayad',
    isDefault: false,
    addedDate: '2025-06-01'
  }
];

// ── Helpers ────────────────────────────────────────────────

const paymentMethodInfo: Record<
  PaymentMethod,
  { icon: typeof CreditCard; label: string; desc: string }
> = {
  'e-invoice': {
    icon: Smartphone,
    label: 'E-faktura',
    desc: 'Elektronisk faktura via Peppol / GLN-nummer'
  },
  gdu: {
    icon: Landmark,
    label: 'GDU (Godkänd för direktupphandling)',
    desc: 'Fakturering via statlig myndighet eller kommun'
  },
  letter: {
    icon: Mail,
    label: 'Brevfaktura',
    desc: 'Pappersfaktura skickas per post'
  },
  card: {
    icon: CreditCard,
    label: 'Kort',
    desc: 'Visa, Mastercard eller American Express'
  },
  'bank-transfer': {
    icon: Landmark,
    label: 'Bankgiro / Plusgiro',
    desc: 'Direktbetalning via bank'
  }
};

const statusConfig: Record<
  Invoice['status'],
  {
    label: string;
    variant: 'default' | 'secondary' | 'destructive' | 'outline';
  }
> = {
  paid: { label: 'Betald', variant: 'secondary' },
  pending: { label: 'Ej betald', variant: 'outline' },
  overdue: { label: 'Förfallen', variant: 'destructive' },
  draft: { label: 'Utkast', variant: 'default' }
};

// ── Billing Address Card ───────────────────────────────────

function BillingAddressCard() {
  const [editing, setEditing] = useState(false);
  const [address, setAddress] = useState<BillingAddress>(defaultAddress);
  const [draft, setDraft] = useState<BillingAddress>(defaultAddress);

  const handleSave = () => {
    setAddress(draft);
    setEditing(false);
    toast.success('Fakturaadress uppdaterad');
  };

  const handleCancel = () => {
    setDraft(address);
    setEditing(false);
  };

  const updateDraft = (field: keyof BillingAddress, value: string) => {
    setDraft((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <Card>
      <CardHeader>
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-2'>
            <Building2 className='h-4 w-4' />
            <CardTitle className='text-base'>Fakturaadress</CardTitle>
          </div>
          {!editing && (
            <Button
              variant='ghost'
              size='sm'
              className='h-7 text-xs'
              onClick={() => setEditing(true)}
            >
              <Pencil className='mr-1 h-3 w-3' />
              Ändra
            </Button>
          )}
        </div>
        <CardDescription>
          Adressen som visas på alla utgående fakturor
        </CardDescription>
      </CardHeader>
      <CardContent>
        {editing ? (
          <div className='grid grid-cols-2 gap-x-4 gap-y-3'>
            <div className='col-span-2 space-y-1.5'>
              <Label className='text-xs'>Företagsnamn</Label>
              <Input
                value={draft.companyName}
                onChange={(e) => updateDraft('companyName', e.target.value)}
                className='h-8 text-sm'
              />
            </div>
            <div className='space-y-1.5'>
              <Label className='text-xs'>Organisationsnummer</Label>
              <Input
                value={draft.orgNumber}
                onChange={(e) => updateDraft('orgNumber', e.target.value)}
                className='h-8 text-sm'
              />
            </div>
            <div className='space-y-1.5'>
              <Label className='text-xs'>VAT-nummer</Label>
              <Input
                value={draft.vatNumber}
                onChange={(e) => updateDraft('vatNumber', e.target.value)}
                className='h-8 text-sm'
              />
            </div>
            <div className='col-span-2 space-y-1.5'>
              <Label className='text-xs'>Gatuadress</Label>
              <Input
                value={draft.street}
                onChange={(e) => updateDraft('street', e.target.value)}
                className='h-8 text-sm'
              />
            </div>
            <div className='space-y-1.5'>
              <Label className='text-xs'>Postnummer</Label>
              <Input
                value={draft.postalCode}
                onChange={(e) => updateDraft('postalCode', e.target.value)}
                className='h-8 text-sm'
              />
            </div>
            <div className='space-y-1.5'>
              <Label className='text-xs'>Stad</Label>
              <Input
                value={draft.city}
                onChange={(e) => updateDraft('city', e.target.value)}
                className='h-8 text-sm'
              />
            </div>
            <div className='space-y-1.5'>
              <Label className='text-xs'>Land</Label>
              <Input
                value={draft.country}
                onChange={(e) => updateDraft('country', e.target.value)}
                className='h-8 text-sm'
              />
            </div>
            <div className='space-y-1.5'>
              <Label className='text-xs'>Referens</Label>
              <Input
                value={draft.reference}
                onChange={(e) => updateDraft('reference', e.target.value)}
                className='h-8 text-sm'
              />
            </div>
            <div className='col-span-2 space-y-1.5'>
              <Label className='text-xs'>Faktura-email</Label>
              <Input
                type='email'
                value={draft.email}
                onChange={(e) => updateDraft('email', e.target.value)}
                className='h-8 text-sm'
              />
            </div>
          </div>
        ) : (
          <div className='grid grid-cols-2 gap-x-6 gap-y-2.5'>
            <InfoRow label='Företagsnamn' value={address.companyName} />
            <InfoRow label='Org.nr' value={address.orgNumber} />
            <InfoRow label='VAT-nummer' value={address.vatNumber} />
            <InfoRow label='Referens' value={address.reference} />
            <InfoRow label='Gatuadress' value={address.street} />
            <InfoRow
              label='Postnummer & Stad'
              value={`${address.postalCode} ${address.city}`}
            />
            <InfoRow label='Land' value={address.country} />
            <InfoRow label='Faktura-email' value={address.email} />
          </div>
        )}
      </CardContent>
      {editing && (
        <CardFooter className='flex justify-end gap-2 border-t pt-4'>
          <Button variant='outline' size='sm' onClick={handleCancel}>
            Avbryt
          </Button>
          <Button size='sm' onClick={handleSave}>
            <Save className='mr-1.5 h-3.5 w-3.5' />
            Spara adress
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className='text-muted-foreground text-[11px] font-medium tracking-wider uppercase'>
        {label}
      </p>
      <p className='text-sm'>{value}</p>
    </div>
  );
}

// ── Payment Methods Card ───────────────────────────────────

function PaymentMethodsCard() {
  const [methods, setMethods] = useState(savedPaymentMethods);
  const [addOpen, setAddOpen] = useState(false);
  const [newType, setNewType] = useState<PaymentMethod>('e-invoice');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardName, setCardName] = useState('');
  const [glnNumber, setGlnNumber] = useState('');
  const [bankgiro, setBankgiro] = useState('');

  const setDefault = (id: string) => {
    setMethods((prev) =>
      prev.map((m) => ({
        ...m,
        isDefault: m.id === id
      }))
    );
    toast.success('Standardbetalningsmetod uppdaterad');
  };

  const removeMethod = (id: string) => {
    const method = methods.find((m) => m.id === id);
    if (method?.isDefault) {
      toast.error('Du kan inte ta bort din standardbetalningsmetod');
      return;
    }
    setMethods((prev) => prev.filter((m) => m.id !== id));
    toast.success('Betalningsmetod borttagen');
  };

  const addMethod = () => {
    const info = paymentMethodInfo[newType];
    let details = '';
    switch (newType) {
      case 'card':
        details = `****${cardNumber.slice(-4)} — ${cardName}`;
        break;
      case 'e-invoice':
        details = `GLN: ${glnNumber} — ${defaultAddress.companyName}`;
        break;
      case 'gdu':
        details = `Myndighet — ${defaultAddress.companyName}`;
        break;
      case 'bank-transfer':
        details = `Bankgiro: ${bankgiro}`;
        break;
      case 'letter':
        details = `${defaultAddress.street}, ${defaultAddress.postalCode} ${defaultAddress.city}`;
        break;
    }
    setMethods((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        type: newType,
        label: info.label,
        details,
        isDefault: prev.length === 0,
        addedDate: new Date().toISOString().slice(0, 10)
      }
    ]);
    toast.success(`${info.label} tillagd`);
    setAddOpen(false);
    setCardNumber('');
    setCardExpiry('');
    setCardName('');
    setGlnNumber('');
    setBankgiro('');
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-2'>
              <Wallet className='h-4 w-4' />
              <CardTitle className='text-base'>Betalningssätt</CardTitle>
            </div>
            <Button
              variant='outline'
              size='sm'
              className='h-7 text-xs'
              onClick={() => setAddOpen(true)}
            >
              <CreditCard className='mr-1 h-3 w-3' />
              Lägg till
            </Button>
          </div>
          <CardDescription>
            Hantera hur du vill ta emot och betala fakturor
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-3'>
          {methods.map((method) => {
            const info = paymentMethodInfo[method.type];
            const Icon = info.icon;
            return (
              <div
                key={method.id}
                className={cn(
                  'flex items-center gap-4 rounded-lg border p-3.5 transition-colors',
                  method.isDefault && 'border-primary/50 bg-primary/5'
                )}
              >
                <div
                  className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-lg',
                    method.isDefault
                      ? 'bg-primary/10 text-primary'
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  <Icon className='h-5 w-5' />
                </div>
                <div className='flex-1'>
                  <div className='flex items-center gap-2'>
                    <p className='text-sm font-medium'>{method.label}</p>
                    {method.isDefault && (
                      <Badge
                        variant='default'
                        className='h-4 px-1.5 text-[9px]'
                      >
                        Standard
                      </Badge>
                    )}
                  </div>
                  <p className='text-muted-foreground text-xs'>
                    {method.details}
                  </p>
                </div>
                <div className='flex items-center gap-1'>
                  {!method.isDefault && (
                    <Button
                      variant='ghost'
                      size='sm'
                      className='h-7 text-[11px]'
                      onClick={() => setDefault(method.id)}
                    >
                      Gör standard
                    </Button>
                  )}
                  <Button
                    variant='ghost'
                    size='sm'
                    className='h-7 px-2 text-red-500 hover:text-red-600'
                    onClick={() => removeMethod(method.id)}
                  >
                    Ta bort
                  </Button>
                </div>
              </div>
            );
          })}
          {methods.length === 0 && (
            <div className='text-muted-foreground flex flex-col items-center gap-2 py-8 text-center text-sm'>
              <Wallet className='h-8 w-8 opacity-20' />
              <p>Inga betalningsmetoder tillagda</p>
              <Button
                variant='outline'
                size='sm'
                onClick={() => setAddOpen(true)}
              >
                Lägg till betalningssätt
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Payment Method Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className='sm:max-w-lg'>
          <DialogHeader>
            <DialogTitle>Lägg till betalningssätt</DialogTitle>
            <DialogDescription>
              Välj hur du vill ta emot fakturor och betala
            </DialogDescription>
          </DialogHeader>

          <div className='space-y-4'>
            <div className='space-y-2'>
              <Label className='text-xs font-medium'>Typ av betalning</Label>
              <div className='grid grid-cols-1 gap-2'>
                {(
                  Object.entries(paymentMethodInfo) as [
                    PaymentMethod,
                    (typeof paymentMethodInfo)[PaymentMethod]
                  ][]
                ).map(([key, info]) => {
                  const Icon = info.icon;
                  return (
                    <button
                      key={key}
                      onClick={() => setNewType(key)}
                      className={cn(
                        'flex items-center gap-3 rounded-lg border p-3 text-left transition-all',
                        newType === key
                          ? 'border-primary bg-primary/5 ring-primary/20 ring-1'
                          : 'hover:bg-accent/50'
                      )}
                    >
                      <div
                        className={cn(
                          'flex h-8 w-8 items-center justify-center rounded-md',
                          newType === key
                            ? 'bg-primary/10 text-primary'
                            : 'bg-muted text-muted-foreground'
                        )}
                      >
                        <Icon className='h-4 w-4' />
                      </div>
                      <div className='flex-1'>
                        <p className='text-sm font-medium'>{info.label}</p>
                        <p className='text-muted-foreground text-xs'>
                          {info.desc}
                        </p>
                      </div>
                      {newType === key && (
                        <Check className='text-primary h-4 w-4 shrink-0' />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <Separator />

            {/* Conditional fields based on type */}
            {newType === 'card' && (
              <div className='space-y-3'>
                <div className='space-y-1.5'>
                  <Label className='text-xs'>Kortnummer</Label>
                  <Input
                    placeholder='1234 5678 9012 3456'
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    className='h-8 text-sm'
                    maxLength={19}
                  />
                </div>
                <div className='grid grid-cols-2 gap-3'>
                  <div className='space-y-1.5'>
                    <Label className='text-xs'>Utgångsdatum</Label>
                    <Input
                      placeholder='MM/ÅÅ'
                      value={cardExpiry}
                      onChange={(e) => setCardExpiry(e.target.value)}
                      className='h-8 text-sm'
                      maxLength={5}
                    />
                  </div>
                  <div className='space-y-1.5'>
                    <Label className='text-xs'>CVC</Label>
                    <Input
                      placeholder='123'
                      className='h-8 text-sm'
                      maxLength={4}
                      type='password'
                    />
                  </div>
                </div>
                <div className='space-y-1.5'>
                  <Label className='text-xs'>Namn på kort</Label>
                  <Input
                    placeholder='Yazan Ghayad'
                    value={cardName}
                    onChange={(e) => setCardName(e.target.value)}
                    className='h-8 text-sm'
                  />
                </div>
              </div>
            )}

            {newType === 'e-invoice' && (
              <div className='space-y-3'>
                <div className='space-y-1.5'>
                  <Label className='text-xs'>GLN-nummer (Peppol)</Label>
                  <Input
                    placeholder='7312345678901'
                    value={glnNumber}
                    onChange={(e) => setGlnNumber(e.target.value)}
                    className='h-8 text-sm'
                    maxLength={13}
                  />
                </div>
                <p className='text-muted-foreground text-[11px]'>
                  E-fakturor skickas via Peppol-nätverket till ert
                  faktureringssystem. Kontakta ert bokföringssystem om ni inte
                  har ett GLN-nummer.
                </p>
              </div>
            )}

            {newType === 'gdu' && (
              <div className='space-y-3'>
                <p className='text-muted-foreground text-xs'>
                  GDU-fakturering kräver att er organisation är registrerad som
                  statlig myndighet eller kommun. Fakturorna skickas med
                  referensnummer till er organisation.
                </p>
                <div className='space-y-1.5'>
                  <Label className='text-xs'>Myndighetskod</Label>
                  <Input
                    placeholder='T.ex. 202100-1111'
                    className='h-8 text-sm'
                  />
                </div>
              </div>
            )}

            {newType === 'bank-transfer' && (
              <div className='space-y-3'>
                <div className='space-y-1.5'>
                  <Label className='text-xs'>Bankgiro / Plusgiro</Label>
                  <Input
                    placeholder='123-4567'
                    value={bankgiro}
                    onChange={(e) => setBankgiro(e.target.value)}
                    className='h-8 text-sm'
                  />
                </div>
              </div>
            )}

            {newType === 'letter' && (
              <div className='space-y-3'>
                <p className='text-muted-foreground text-xs'>
                  Brevfakturan skickas till er registrerade fakturaadress.
                  Kontrollera att adressen är uppdaterad innan ni lägger till
                  detta betalningssätt.
                </p>
                <div className='bg-muted/50 rounded-md p-3'>
                  <p className='text-xs font-medium'>
                    {defaultAddress.companyName}
                  </p>
                  <p className='text-muted-foreground text-xs'>
                    {defaultAddress.street}
                  </p>
                  <p className='text-muted-foreground text-xs'>
                    {defaultAddress.postalCode} {defaultAddress.city}
                  </p>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant='outline' onClick={() => setAddOpen(false)}>
              Avbryt
            </Button>
            <Button onClick={addMethod}>
              <Check className='mr-1.5 h-3.5 w-3.5' />
              Lägg till
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── Invoice History Card ───────────────────────────────────

function InvoiceHistory() {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterYear, setFilterYear] = useState<string>('all');

  const years = mockInvoices
    .map((i) => i.date.slice(0, 4))
    .filter((y, i, arr) => arr.indexOf(y) === i)
    .sort()
    .reverse();

  const filtered = mockInvoices.filter((inv) => {
    const matchStatus = filterStatus === 'all' || inv.status === filterStatus;
    const matchYear = filterYear === 'all' || inv.date.startsWith(filterYear);
    return matchStatus && matchYear;
  });

  const totalPaid = mockInvoices
    .filter((i) => i.status === 'paid')
    .reduce(
      (sum, i) =>
        sum + parseFloat(i.amount.replace(/[^\d,]/g, '').replace(',', '.')),
      0
    );

  const openPreview = (inv: Invoice) => {
    setSelectedInvoice(inv);
    setPreviewOpen(true);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-2'>
              <Receipt className='h-4 w-4' />
              <CardTitle className='text-base'>Fakturor</CardTitle>
            </div>
            <div className='flex items-center gap-2'>
              <Select value={filterYear} onValueChange={setFilterYear}>
                <SelectTrigger className='h-7 w-28 text-xs'>
                  <SelectValue placeholder='År' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='all'>Alla år</SelectItem>
                  {years.map((y) => (
                    <SelectItem key={y} value={y}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className='h-7 w-28 text-xs'>
                  <SelectValue placeholder='Status' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='all'>Alla</SelectItem>
                  <SelectItem value='paid'>Betalda</SelectItem>
                  <SelectItem value='pending'>Ej betalda</SelectItem>
                  <SelectItem value='overdue'>Förfallna</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <CardDescription>
            Totalt betalat: {totalPaid.toLocaleString('sv-SE')} SEK &bull;{' '}
            {mockInvoices.length} fakturor
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className='rounded-md border'>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className='text-xs'>Fakturanr</TableHead>
                  <TableHead className='text-xs'>Datum</TableHead>
                  <TableHead className='text-xs'>Förfallodatum</TableHead>
                  <TableHead className='text-xs'>Belopp</TableHead>
                  <TableHead className='text-xs'>Betalning</TableHead>
                  <TableHead className='text-xs'>Status</TableHead>
                  <TableHead className='text-right text-xs'>Åtgärder</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((inv) => {
                  const sc = statusConfig[inv.status];
                  const pmInfo = paymentMethodInfo[inv.paymentMethod];
                  return (
                    <TableRow key={inv.id}>
                      <TableCell className='text-xs font-medium'>
                        {inv.number}
                      </TableCell>
                      <TableCell className='text-muted-foreground text-xs'>
                        {inv.date}
                      </TableCell>
                      <TableCell className='text-muted-foreground text-xs'>
                        {inv.dueDate}
                      </TableCell>
                      <TableCell className='text-xs font-medium'>
                        {inv.amount} {inv.currency}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant='outline'
                          className='text-[10px] font-normal'
                        >
                          {pmInfo.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={sc.variant} className='text-[10px]'>
                          {sc.label}
                        </Badge>
                      </TableCell>
                      <TableCell className='text-right'>
                        <div className='flex items-center justify-end gap-1'>
                          <Button
                            variant='ghost'
                            size='sm'
                            className='h-7 w-7 p-0'
                            onClick={() => openPreview(inv)}
                            title='Visa'
                          >
                            <Eye className='h-3.5 w-3.5' />
                          </Button>
                          <Button
                            variant='ghost'
                            size='sm'
                            className='h-7 w-7 p-0'
                            onClick={() =>
                              toast.success(`Laddar ner ${inv.number}.pdf...`)
                            }
                            title='Ladda ner PDF'
                          >
                            <Download className='h-3.5 w-3.5' />
                          </Button>
                          <Button
                            variant='ghost'
                            size='sm'
                            className='h-7 w-7 p-0'
                            onClick={() =>
                              toast.success(
                                `Faktura ${inv.number} skickad till ${defaultAddress.email}`
                              )
                            }
                            title='Skicka via email'
                          >
                            <Send className='h-3.5 w-3.5' />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          {filtered.length === 0 && (
            <div className='text-muted-foreground flex flex-col items-center gap-2 py-8 text-center text-sm'>
              <FileText className='h-8 w-8 opacity-20' />
              Inga fakturor hittades
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invoice Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className='sm:max-w-lg'>
          <DialogHeader>
            <DialogTitle>Faktura {selectedInvoice?.number}</DialogTitle>
            <DialogDescription>
              Utfärdad {selectedInvoice?.date} &bull; Förfaller{' '}
              {selectedInvoice?.dueDate}
            </DialogDescription>
          </DialogHeader>
          {selectedInvoice && (
            <div className='space-y-4'>
              <div className='bg-muted/30 rounded-lg p-4'>
                <div className='grid grid-cols-2 gap-4'>
                  <div>
                    <p className='text-muted-foreground text-[11px] tracking-wider uppercase'>
                      Från
                    </p>
                    <p className='text-sm font-medium'>SWEO AI AB</p>
                    <p className='text-muted-foreground text-xs'>
                      Kungsgatan 44, 111 35 Stockholm
                    </p>
                  </div>
                  <div>
                    <p className='text-muted-foreground text-[11px] tracking-wider uppercase'>
                      Till
                    </p>
                    <p className='text-sm font-medium'>
                      {defaultAddress.companyName}
                    </p>
                    <p className='text-muted-foreground text-xs'>
                      {defaultAddress.street}, {defaultAddress.postalCode}{' '}
                      {defaultAddress.city}
                    </p>
                  </div>
                </div>
              </div>

              <Separator />

              <div className='space-y-2'>
                <div className='flex justify-between text-sm'>
                  <span>SWEO AI Pro-plan (månad)</span>
                  <span className='font-medium'>
                    {selectedInvoice.amount} SEK
                  </span>
                </div>
                <div className='flex justify-between text-sm'>
                  <span>Moms (25%)</span>
                  <span className='font-medium'>
                    {(
                      parseFloat(
                        selectedInvoice.amount
                          .replace(/[^\d,]/g, '')
                          .replace(',', '.')
                      ) * 0.25
                    )
                      .toFixed(2)
                      .replace('.', ',')}{' '}
                    SEK
                  </span>
                </div>
                <Separator />
                <div className='flex justify-between text-sm font-bold'>
                  <span>Totalt</span>
                  <span>
                    {(
                      parseFloat(
                        selectedInvoice.amount
                          .replace(/[^\d,]/g, '')
                          .replace(',', '.')
                      ) * 1.25
                    )
                      .toFixed(2)
                      .replace('.', ',')}{' '}
                    SEK
                  </span>
                </div>
              </div>

              <div className='flex items-center justify-between'>
                <Badge variant={statusConfig[selectedInvoice.status].variant}>
                  {statusConfig[selectedInvoice.status].label}
                </Badge>
                <Badge variant='outline' className='text-xs font-normal'>
                  {paymentMethodInfo[selectedInvoice.paymentMethod].label}
                </Badge>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant='outline'
              size='sm'
              onClick={() =>
                toast.success(
                  `Faktura ${selectedInvoice?.number} skickad till ${defaultAddress.email}`
                )
              }
            >
              <Send className='mr-1.5 h-3.5 w-3.5' />
              Skicka email
            </Button>
            <Button
              size='sm'
              onClick={() =>
                toast.success(`Laddar ner ${selectedInvoice?.number}.pdf...`)
              }
            >
              <Download className='mr-1.5 h-3.5 w-3.5' />
              Ladda ner PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── Main ───────────────────────────────────────────────────

export default function BillingClient() {
  const { tenant, loading } = useTenant();

  if (loading) {
    return (
      <div className='flex items-center justify-center py-20'>
        <Icons.spinner className='text-muted-foreground h-8 w-8 animate-spin' />
      </div>
    );
  }

  return (
    <div className='space-y-6'>
      <div>
        <h2 className='text-2xl font-bold tracking-tight'>Fakturering</h2>
        <p className='text-muted-foreground text-sm'>
          Hantera fakturaadress, betalningssätt och tidigare fakturor
        </p>
      </div>

      <Tabs defaultValue='overview' className='space-y-4'>
        <TabsList>
          <TabsTrigger value='overview' className='text-xs'>
            <Building2 className='mr-1.5 h-3.5 w-3.5' />
            Översikt
          </TabsTrigger>
          <TabsTrigger value='invoices' className='text-xs'>
            <Receipt className='mr-1.5 h-3.5 w-3.5' />
            Fakturor
          </TabsTrigger>
        </TabsList>

        <TabsContent value='overview' className='space-y-6'>
          {/* Quick summary */}
          <div className='grid gap-4 md:grid-cols-3'>
            <Card>
              <CardContent className='flex items-center gap-3 pt-6'>
                <div className='bg-primary/10 flex h-10 w-10 items-center justify-center rounded-lg'>
                  <Receipt className='text-primary h-5 w-5' />
                </div>
                <div>
                  <p className='text-muted-foreground text-xs'>Nästa faktura</p>
                  <p className='text-lg font-bold'>4 990,00 SEK</p>
                  <p className='text-muted-foreground text-[11px]'>
                    Förfaller 2026-02-28
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className='flex items-center gap-3 pt-6'>
                <div className='flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10'>
                  <Check className='h-5 w-5 text-green-600' />
                </div>
                <div>
                  <p className='text-muted-foreground text-xs'>
                    Betalningsstatus
                  </p>
                  <p className='text-lg font-bold text-green-600'>
                    Allt betalt
                  </p>
                  <p className='text-muted-foreground text-[11px]'>
                    Inga utestående fakturor
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className='flex items-center gap-3 pt-6'>
                <div className='flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10'>
                  <Wallet className='h-5 w-5 text-blue-600' />
                </div>
                <div>
                  <p className='text-muted-foreground text-xs'>
                    Betalningssätt
                  </p>
                  <p className='text-lg font-bold'>E-faktura</p>
                  <p className='text-muted-foreground text-[11px]'>
                    Via Peppol-nätverket
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          <BillingAddressCard />
          <PaymentMethodsCard />
        </TabsContent>

        <TabsContent value='invoices'>
          <InvoiceHistory />
        </TabsContent>
      </Tabs>
    </div>
  );
}
