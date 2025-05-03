import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.0.0/+esm';

const supabaseUrl = 'https://kiwuzfwvrahadfearfcs.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtpd3V6Znd2cmFoYWRmZWFyZmNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ3Njc2NTIsImV4cCI6MjA2MDM0MzY1Mn0.8sI-kWhIsMf_u_QaH5mLmo66oPjZhNspNjUOjmAlYZo'; 
export const supabase = createClient(supabaseUrl, supabaseKey);

// Ensure the 'products' table exists in your Supabase database with columns:
// id (auto-increment), name (text), price (float), quantity (integer), category (text), image (text)

// Example schema for 'products' table:
// CREATE TABLE products (
//   id SERIAL PRIMARY KEY,
//   name TEXT NOT NULL,
//   price FLOAT NOT NULL,
//   quantity INT NOT NULL,
//   category TEXT NOT NULL,
//   image TEXT NOT NULL
// );

// Ensure the 'product-images' storage bucket exists in your Supabase project.
// You can create it via the Supabase dashboard under "Storage" -> "Create Bucket".

// Example usage of the storage bucket:
// supabase.storage.from('product-images').upload('fileName', fileContent);

// Real-time subscription to profiles table
supabase.channel('public:profiles')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, payload => {
        console.log('Change received!', payload);
        // Handle the real-time update here
    })
    .subscribe();

// Function to sign up a user and insert data into profiles table
export async function signUpUser(username, email, password, confirmPassword) {
    if (password !== confirmPassword) {
        console.log("Passwords do not match");
        return false;
    }

    const { data, error } = await supabase.auth.signUp({
        email: email,
        password: password
    });

    if (error) {
        console.log("Error signing up:", error.message);
        return false;
    }

    console.log("User signed up successfully:", data);

    // If user is null, wait until they confirm their email before inserting profile
    if (!data.user) {
        alert("Confirmation email sent. Please verify your email before signing in.");
        return true;
    }

    const { error: insertError } = await supabase
        .from('profiles')
        .insert([
            { id: data.user.id, username: username, email: email }
        ]);

    if (insertError) {
        console.log("Error inserting into profiles table:", insertError.message);
        return false;
    }

    console.log("Data inserted into profiles table successfully");
    return true;
}


// Function to sign in a user and check if they exist in the profiles table
export async function signInUser(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password
    });

    if (error) {
        console.log("Error signing in:", error.message);
        return false;
    }

    console.log("User signed in successfully:", data);

    // Check if the user exists in the profiles table
    const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();

    if (profileError) {
        console.log("Error checking profiles table:", profileError.message);
        return false;
    }

    console.log("User exists in profiles table:", profileData);
    return true;
}

export async function getUserType() {
    const { data: session, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session || !session.session || !session.session.user) {
        console.log("No user session found or error fetching session:", sessionError?.message);
        return null; // Return null if no session or user is found
    }

    const userId = session.session.user.id;

    if (!userId) {
        console.log("User ID is undefined");
        return null; // Return null if userId is undefined
    }

    const { data: profileData, error } = await supabase
        .from('profiles')
        .select('user_type')
        .eq('id', userId)
        .single();

    if (error) {
        console.log("Error fetching user type:", error.message);
        return null;
    }

    return profileData.user_type;
}

export async function fetchBMIHistory() {
    const { data: session, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session || !session.session || !session.session.user) {
        console.log("No user session found or error fetching session:", sessionError?.message);
        return [];
    }
    const userId = session.session.user.id;
    const { data, error } = await supabase
        .from('bmi_history')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
    if (error) {
        console.log("Error fetching BMI history:", error.message);
        return [];
    }
    return data;
} 



/**
 * Resizes an image to a fixed size of 250x250px.
 * @param {File} imageFile - The image file to resize.
 * @returns {Promise<File>} - A resized image file.
 */
async function resizeImage(imageFile) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const fixedSize = 250; // Fixed size for both width and height
                canvas.width = fixedSize;
                canvas.height = fixedSize;

                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, fixedSize, fixedSize);

                canvas.toBlob((blob) => {
                    if (blob) {
                        const resizedFile = new File([blob], imageFile.name, {
                            type: imageFile.type,
                            lastModified: Date.now(),
                        });
                        resolve(resizedFile);
                    } else {
                        reject(new Error('Failed to resize image.'));
                    }
                }, imageFile.type);
            };
            img.src = event.target.result;
        };
        reader.onerror = (error) => reject(error);
        reader.readAsDataURL(imageFile);
    });
}




