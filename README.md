
# Spotify Clone App

Hey there! This is my take on a Spotify-like app built with React Native, featuring a smooth login flow using Supabase for authentication. It’s a simple music streaming app that lets users sign up or log in with their email and password or phone number with an OTP. I had a blast putting this together, and I hope you enjoy checking it out!

## Setup

Getting this app up and running is pretty straightforward. Here’s what you need to do:

1. **Clone the repo**
    
    ```bash
    git clone <repo-url>
    cd <repo-name>
    
    ```
    
2. **Install dependencies**
    
    ```bash
    npm install
    
    ```
    
3. **Set up Supabase**
    - Head over to Supabase and create a new project.
    - Grab your Supabase URL and anon key from the dashboard.
    - Pop those into `lib/supabase.ts`.
    - Make sure to enable **email** and **phone (SMS OTP)** authentication in Supabase’s auth settings.
4. **Run the app**
    
    ```bash
    npm start
    
    ```
    
    Fire up the Expo Go app on your phone, scan the QR code, and you’re good to go!
    

## App Structure

Here’s a quick peek at how I organized things:

- `assets/logo.png` - The app’s logo, giving it that Spotify vibe.
- `components/` - All the screens live here:
    - `Splash.tsx` - A cool splash screen with the logo.
    - `SignUpOrLogIn.tsx` - The starting point to pick email or phone login.
    - `Auth.tsx` - Where the magic happens for email/password and phone OTP login.
    - `Home.tsx` - The main dashboard once you’re logged in.
    - `Account.tsx` - A profile screen to tweak your info or sign out.
- `lib/supabase.ts` - Sets up Supabase for auth and data.
- `App.tsx` - The main file that ties everything together with navigation.

## Flow

Here’s how the app flows when you use it:

1. The **splash screen** shows off the logo for 3 seconds—sets the mood!
2. You land on the **SignUpOrLogIn** screen to choose how to log in.
3. Pick your login method:
    - **Email**: Enter your email and password to sign up or log in.
    - **Phone**: Get an OTP sent to your phone, then verify it.
4. Once you’re in, you hit the **Home** screen to explore the app.
5. From there, you can hop to the **Account** screen to update your profile or sign out.

## Why I Chose This Authentication Strategy

Since this app is meant to feel like Spotify, I wanted a login process that’s fast, secure, and familiar for music lovers. Here’s why I went with **email and password** plus **phone OTP**:

- **It’s what users know**: Email and password is super common—everyone’s used it before, just like on Spotify. It feels intuitive whether you’re signing up or logging back in.
- **Phone OTP for flexibility**: Adding phone login with OTP makes it easy for folks who prefer using their number. It’s quick, especially for users who are out and about, listening to tunes on the go.
- **Secure and reliable**: Passwords (when strong!) and OTPs (which expire fast) keep things locked down tight. I figured music fans might use this app on shared devices or public Wi-Fi, so security matters.
- **Keeps it simple**: Both options let users jump into the app without overthinking it, which is perfect for a music app where you just want to hit play.

## Why This Fits the App’s Architecture

Building this with React Native and Supabase made my life easier, and the auth strategy fits like a glove. Here’s why I think it works so well:

- **Supabase makes it easy**: Supabase handles email/password and phone OTP right out of the box. I didn’t have to reinvent the wheel or mess with complex auth code, which kept things clean.
- **Lightweight for React Native**: The app runs on the client side, and OTPs are stateless, so I don’t need to store sensitive stuff like passwords on the phone. Email/password login is managed securely by Supabase, too.
- **Scales without stress**: Supabase’s serverless setup means if tons of people start using my app (fingers crossed!), it’ll handle the load without me worrying about servers.
- **Matches the vibe**: The app’s meant to be simple and focused on the frontend, just like Spotify’s slick interface. This auth setup lets me keep the code lean and focus on the user experience.

---