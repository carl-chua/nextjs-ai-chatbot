import { createUser, getUser } from '@/lib/db/queries';
import { z } from 'zod';
import { signIn } from '../../auth';

const authFormSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();
    const validatedData = authFormSchema.parse({
      email,
      password,
    });

    const [user] = await getUser(validatedData.email);

    if (user) {
      return Response.json({ message: 'user_exists', code: 10001 });
    }
    await createUser(validatedData.email, validatedData.password);
    await signIn('credentials', {
      email: validatedData.email,
      password: validatedData.password,
      redirect: false,
    });

    return Response.json({ message: 'success', code: 0 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ message: 'invalid_data', code: 10001 });
    }

    return Response.json({ message: 'failed', code: 10001 });
  }
}
