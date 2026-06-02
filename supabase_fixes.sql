-- 1. CORRIGER L'ERREUR 'PGRST116' (Synchroniser les anciens utilisateurs)
-- Cela insérera tous les utilisateurs d'authentification existants qui manquent dans la table `users`.
INSERT INTO public.users (uid, email, "displayName", "fullName", role, "createdAt")
SELECT id, email, 
  COALESCE(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name', ''),
  COALESCE(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name', ''),
  'customer',
  created_at
FROM auth.users
WHERE id NOT IN (SELECT uid FROM public.users);


-- 2. CORRIGER L'ERREUR 403 (Permettre la lecture des `settings`)
-- Crée la politique pour que tout le monde (même anonyme) puisse lire les réglages (ex: announcement-bar)
DROP POLICY IF EXISTS "Public can read settings" ON public.settings;
CREATE POLICY "Public can read settings" ON public.settings FOR SELECT USING (true);


-- 3. CORRIGER LES ERREURS 404 (Créer les tables manquantes)

-- Table des alertes (notifications)
CREATE TABLE IF NOT EXISTS public.alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  title text,
  message text,
  type text,
  link text,
  "isRead" boolean DEFAULT false,
  "createdAt" timestamp with time zone DEFAULT now()
);
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own alerts" ON public.alerts;
CREATE POLICY "Users can view their own alerts" ON public.alerts FOR SELECT USING (auth.uid() = "userId");
DROP POLICY IF EXISTS "Users can update their own alerts" ON public.alerts;
CREATE POLICY "Users can update their own alerts" ON public.alerts FOR UPDATE USING (auth.uid() = "userId");
DROP POLICY IF EXISTS "Admins can insert alerts" ON public.alerts;
CREATE POLICY "Admins can insert alerts" ON public.alerts FOR INSERT WITH CHECK ((SELECT role FROM public.users WHERE uid = auth.uid()) = 'admin');

-- Table des réservations (bookingApplications)
CREATE TABLE IF NOT EXISTS public."bookingApplications" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "usersId" uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  "serviceId" text,
  "serviceTitle" text,
  "paymentStatus" text,
  "bookingStatus" text,
  "selectedDate" timestamp with time zone,
  "timeSlot" text,
  "clientInfo" jsonb,
  "paymentMethod" text,
  "totalAmount" numeric,
  "orderId" text,
  "createdAt" timestamp with time zone DEFAULT now(),
  "updatedAt" timestamp with time zone DEFAULT now()
);
ALTER TABLE public."bookingApplications" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own bookings" ON public."bookingApplications";
CREATE POLICY "Users can view their own bookings" ON public."bookingApplications" FOR SELECT USING (auth.uid() = "usersId");
DROP POLICY IF EXISTS "Users can insert their own bookings" ON public."bookingApplications";
CREATE POLICY "Users can insert their own bookings" ON public."bookingApplications" FOR INSERT WITH CHECK (auth.uid() = "usersId");
DROP POLICY IF EXISTS "Users can update their own bookings" ON public."bookingApplications";
CREATE POLICY "Users can update their own bookings" ON public."bookingApplications" FOR UPDATE USING (auth.uid() = "usersId");
DROP POLICY IF EXISTS "Admins can do everything on bookings" ON public."bookingApplications";
CREATE POLICY "Admins can do everything on bookings" ON public."bookingApplications" FOR ALL USING ((SELECT role FROM public.users WHERE uid = auth.uid()) = 'admin');

-- Tables pour le Chat
CREATE TABLE IF NOT EXISTS public.chats (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  "userId" uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  "userName" text,
  "userEmail" text,
  "userPhone" text,
  "lastMessage" text,
  "lastMessageSenderId" uuid,
  "lastMessageAt" timestamp with time zone,
  "unreadByAdmin" boolean DEFAULT false,
  "unreadByUser" boolean DEFAULT false,
  "createdAt" timestamp with time zone DEFAULT now(),
  "updatedAt" timestamp with time zone DEFAULT now()
);
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view and update their own chats" ON public.chats;
CREATE POLICY "Users can view and update their own chats" ON public.chats FOR ALL USING (auth.uid() = id);
DROP POLICY IF EXISTS "Admins can view and update all chats" ON public.chats;
CREATE POLICY "Admins can view and update all chats" ON public.chats FOR ALL USING ((SELECT role FROM public.users WHERE uid = auth.uid()) = 'admin');

CREATE TABLE IF NOT EXISTS public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "chatId" uuid REFERENCES public.chats(id) ON DELETE CASCADE,
  "senderId" uuid,
  "senderName" text,
  text text,
  type text,
  "mediaUrl" text,
  "voiceDuration" numeric,
  "createdAt" timestamp with time zone DEFAULT now(),
  "isRead" boolean DEFAULT false
);
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can access messages of their chat" ON public.messages;
CREATE POLICY "Users can access messages of their chat" ON public.messages FOR ALL USING (auth.uid() = "chatId");
DROP POLICY IF EXISTS "Admins can access all messages" ON public.messages;
CREATE POLICY "Admins can access all messages" ON public.messages FOR ALL USING ((SELECT role FROM public.users WHERE uid = auth.uid()) = 'admin');
