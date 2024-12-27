import { mutation } from "./_generated/server";
import { v } from "convex/values";

async function generateSalt(): Promise<string> {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function hashPassword(password: string, salt: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + salt);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(byte => byte.toString(16).padStart(2, '0')).join('');
}

export const migrateAppUsers = mutation({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("appUser").collect();
    
    for (const user of users) {
      if (!user.salt) {
        const salt = await generateSalt();
        const hashedPassword = await hashPassword(user.password, salt);
        
        await ctx.db.patch(user._id, {
          salt: salt,
          password: hashedPassword
        });
      }
    }
    
    return { success: true, message: "Migration completed successfully" };
  },
});

