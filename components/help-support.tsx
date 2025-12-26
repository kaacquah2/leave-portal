'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { HelpCircle, Mail, Phone, MessageCircle, Book } from 'lucide-react'

export default function HelpSupport() {
  const faqs = [
    {
      question: 'How do I apply for leave?',
      answer: 'Navigate to "Leave History" and click "Request Leave". Fill in the leave application form with your leave type, dates, and reason, then submit for approval.',
    },
    {
      question: 'How long does leave approval take?',
      answer: 'Leave approval typically takes 1-3 business days. Your supervisor will review and approve or reject your request. You will receive a notification once a decision is made.',
    },
    {
      question: 'Can I cancel a leave request?',
      answer: 'Yes, you can cancel a pending leave request. Go to your Leave History, find the pending request, and click the cancel button.',
    },
    {
      question: 'How do I check my leave balance?',
      answer: 'Go to "Leave Balances" in your dashboard to view your current leave balance for each leave type.',
    },
    {
      question: 'What should I do if I forgot my password?',
      answer: 'Click "Forgot Password?" on the login page. If you need immediate assistance, please contact HR.',
    },
    {
      question: 'How do I download my approval letter?',
      answer: 'For approved leave requests, you can download the approval letter by clicking the "Download Approval Letter" button in your Leave History.',
    },
    {
      question: 'Who can I contact for technical support?',
      answer: 'For technical issues, please contact the IT department or HR. Contact information is provided below.',
    },
  ]

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Help & Support</h1>
        <p className="text-muted-foreground mt-1">Get assistance with using the HR Leave Portal</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5" />
              Email Support
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-2">For general inquiries:</p>
            <p className="font-medium">hr@mofa.gov.gh</p>
            <p className="text-sm text-muted-foreground mt-4">For technical issues:</p>
            <p className="font-medium">it-support@mofa.gov.gh</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="w-5 h-5" />
              Phone Support
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-2">HR Department:</p>
            <p className="font-medium">+233 XX XXX XXXX</p>
            <p className="text-sm text-muted-foreground mt-4">IT Department:</p>
            <p className="font-medium">+233 XX XXX XXXX</p>
            <p className="text-xs text-muted-foreground mt-2">Mon-Fri, 8:00 AM - 5:00 PM</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5" />
              Office Location
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-2">Ministry of Fisheries & Aquaculture Development</p>
            <p className="font-medium">Accra, Ghana</p>
            <p className="text-xs text-muted-foreground mt-2">Visit us during office hours</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5" />
            Frequently Asked Questions
          </CardTitle>
          <CardDescription>Common questions and answers</CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, index) => (
              <AccordionItem key={index} value={`item-${index}`}>
                <AccordionTrigger>{faq.question}</AccordionTrigger>
                <AccordionContent>{faq.answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Book className="w-5 h-5" />
            User Guides
          </CardTitle>
          <CardDescription>Step-by-step guides for common tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 border rounded-lg">
              <h3 className="font-semibold mb-2">How to Apply for Leave</h3>
              <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                <li>Log in to your account</li>
                <li>Navigate to "Leave History"</li>
                <li>Click "Request Leave" button</li>
                <li>Fill in the leave application form</li>
                <li>Select leave type, dates, and provide reason</li>
                <li>Submit for approval</li>
              </ol>
            </div>
            <div className="p-4 border rounded-lg">
              <h3 className="font-semibold mb-2">How to Check Leave Balance</h3>
              <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                <li>Go to your Dashboard</li>
                <li>Click on "Leave Balances"</li>
                <li>View your current balance for each leave type</li>
              </ol>
            </div>
            <div className="p-4 border rounded-lg">
              <h3 className="font-semibold mb-2">How to Download Approval Letter</h3>
              <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                <li>Go to "Leave History"</li>
                <li>Find your approved leave request</li>
                <li>Click "Download Approval Letter" button</li>
                <li>The letter will open in a new window for printing</li>
              </ol>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

