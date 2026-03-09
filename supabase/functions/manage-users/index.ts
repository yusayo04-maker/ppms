import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.42.0"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // Handle CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

        if (!supabaseUrl || !supabaseServiceKey) {
            console.error('Missing environment variables: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
            throw new Error('Server configuration error')
        }

        // Use service role key to perform admin actions
        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        })

        // Get current user's session to verify they are an mho_admin
        const authHeader = req.headers.get('Authorization') || req.headers.get('authorization')
        if (!authHeader) {
            console.error('Missing Authorization header')
            return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 401,
            })
        }

        const token = authHeader.replace('Bearer ', '')
        const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)

        if (userError || !user) {
            console.error('Auth verification error:', userError)
            return new Response(JSON.stringify({ error: 'Unauthorized', details: userError?.message }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 401,
            })
        }

        // Double check role in metadata or profiles table
        const userRole = user.user_metadata?.role

        if (userRole !== 'mho_admin') {
            // Fallback: check profiles table just in case metadata is out of sync
            const { data: profile, error: profileError } = await supabaseAdmin
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .single()

            if (profileError || profile?.role !== 'mho_admin') {
                console.error('Forbidden access attempt by user:', user.id, 'Role:', userRole)
                return new Response(JSON.stringify({ error: 'Forbidden: Only MHO Administrators can manage users.' }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    status: 403,
                })
            }
        }

        const { action, userId, newPassword } = await req.json()
        console.log(`Executing action: ${action} for target: ${userId}`)

        if (action === 'reset-password-bhw') {
            if (!userId || !newPassword) {
                throw new Error('User ID and context missing')
            }

            // 1. Get the user to verify it's a BHW
            const { data: userData, error: fetchError } = await supabaseAdmin.auth.admin.getUserById(userId)
            if (fetchError || !userData.user) {
                console.error('Error fetching target user:', fetchError)
                throw fetchError || new Error('User not found')
            }

            const targetRole = userData.user.user_metadata?.role
            if (targetRole !== 'bhw') {
                console.warn('Attempted BHW reset on non-BHW role:', targetRole)
                throw new Error(`This action is only allowed for BHW accounts (target is ${targetRole}). For Admins, use "Send Reset Email".`)
            }

            // 2. Perform the update
            const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
                userId,
                { password: newPassword }
            )

            if (updateError) {
                console.error('Error updating password:', updateError)
                throw updateError
            }

            return new Response(JSON.stringify({ success: true, message: 'Password updated successfully' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            })
        }

        if (action === 'reset-password-mho') {
            if (!userId) {
                throw new Error('User ID missing')
            }

            // 1. Get user email
            const { data: userData, error: fetchError } = await supabaseAdmin.auth.admin.getUserById(userId)
            if (fetchError || !userData.user) {
                console.error('Error fetching target user:', fetchError)
                throw fetchError || new Error('User not found')
            }

            const email = userData.user.email
            if (!email) throw new Error('User has no email registered')

            // 2. send reset email
            // Note: resetPasswordForEmail uses the user's password reset flow
            const { error: resetError } = await supabaseAdmin.auth.resetPasswordForEmail(email, {
                redirectTo: `${req.headers.get('origin') || 'https://ppms-valladolid.vercel.app'}/reset-password`,
            })

            if (resetError) {
                console.error('Error sending reset email:', resetError)
                throw resetError
            }

            return new Response(JSON.stringify({ success: true, message: 'Reset email sent successfully' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            })
        }

        return new Response(JSON.stringify({ error: 'Invalid action' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })

    } catch (error: any) {
        console.error('Function execution error:', error)
        return new Response(JSON.stringify({ error: error.message || 'Internal Server Error' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})
