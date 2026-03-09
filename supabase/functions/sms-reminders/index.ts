import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const TEXTBEE_API_KEY = Deno.env.get('TEXTBEE_API_KEY')
const TEXTBEE_DEVICE_ID = Deno.env.get('TEXTBEE_DEVICE_ID')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Get current date + 3 days
    const targetDate = new Date()
    targetDate.setDate(targetDate.getDate() + 3)
    const targetDateStr = targetDate.toISOString().split('T')[0]

    console.log(`Checking for tasks on target date: ${targetDateStr}`)

    // 2. Fetch pending laboratories due in 3 days
    const { data: labs, error: labError } = await supabase
      .from('laboratories')
      .select('*, cycle:pregnancy_cycles(patient:patients(*))')
      .eq('scheduled_date', targetDateStr)
      .eq('status', 'Pending')

    if (labError) throw labError

    // 3. Fetch upcoming milestones (maternal checkups) due in 3 days, excluding 1st pre-natal visit
    const { data: milestones, error: milestoneError } = await supabase
      .from('milestones')
      .select('*, cycle:pregnancy_cycles(patient:patients(*))')
      .eq('target_date', targetDateStr)
      .eq('status', 'upcoming')
      .neq('title', '1st Prenatal Visit')

    if (milestoneError) throw milestoneError

    const results = []

    // 4. Process Lab Tests
    for (const lab of (labs || [])) {
      const patient = lab.cycle?.patient
      if (!patient?.contact_no) continue

      const message = `Good day Mrs. ${patient.first_name}. This is a reminder that the deadline for submitting your laboratory result for ${lab.test_name} is on ${targetDateStr}. Please ensure your results are submitted on or before the stated date. Your health and your baby's well-being matter—regular maternal care leads to a safer pregnancy.`

      const res = await sendSMS(patient.contact_no, message, patient.id, 'lab_test')
      results.push(res)
    }

    // 5. Process Milestones (Maternal Checkups)
    for (const milestone of (milestones || [])) {
      const patient = milestone.cycle?.patient
      if (!patient?.contact_no) continue

      const message = `Good day Mrs. ${patient.first_name}. This is a reminder that your maternal checkup for ${milestone.title} is scheduled on ${targetDateStr}. Please proceed to the Valladolid Municipal Health Office on your scheduled date. Regular prenatal visits help ensure a healthy mother and baby.`

      const res = await sendSMS(patient.contact_no, message, patient.id, 'maternal_checkup')
      results.push(res)
    }

    return new Response(JSON.stringify({ success: true, processed: results.length, details: results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error: any) {
    console.error(error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})

async function sendSMS(phoneNumber: string, message: string, patientId: string, type: string) {
  try {
    // Ensure phone number starts with +63
    let formattedNumber = phoneNumber.trim();
    if (formattedNumber.startsWith('0')) {
      formattedNumber = '+63' + formattedNumber.substring(1);
    } else if (!formattedNumber.startsWith('+')) {
      formattedNumber = '+63' + formattedNumber;
    }

    const response = await fetch('https://api.textbee.dev/api/v1/gateway/devices/' + TEXTBEE_DEVICE_ID + '/send-sms', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': TEXTBEE_API_KEY,
      },
      body: JSON.stringify({
        recipients: [formattedNumber],
        message: message,
      }),
    })

    const data = await response.json()

    // Log success
    await supabase.from('sms_logs').insert({
      patient_id: patientId,
      contact_no: phoneNumber,
      message_text: message,
      message_type: type,
      status: response.ok ? 'success' : 'failed',
      error_message: response.ok ? null : JSON.stringify(data)
    })

    return { phoneNumber, status: response.ok ? 'success' : 'failed' }

  } catch (error: any) {
    console.error(`Failed to send SMS to ${phoneNumber}:`, error)

    await supabase.from('sms_logs').insert({
      patient_id: patientId,
      contact_no: phoneNumber,
      message_text: message,
      message_type: type,
      status: 'failed',
      error_message: error.message
    })

    return { phoneNumber, status: 'failed', error: error.message }
  }
}
