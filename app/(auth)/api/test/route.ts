export async function GET(request: Request) {
  return Response.json({ messsage: 'test' }, { status: 200 });
}
