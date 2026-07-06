const fs = require('fs');
let c = fs.readFileSync('prisma/schema.prisma', 'utf8');
c = c.replace(/model User \{[\s\S]*?seatCount       Int/, `model User {
  id                    String    @id @default(uuid())
  email                 String    @unique
  name                  String?
  password              String?
  role                  String    @default("CUSTOMER")
  iban                  String?
  telegramUsername      String?
  telegramBotToken      String?
  telegramChatId        String?
  paymentMethod         String?
  isPaymentInfoVerified Boolean   @default(false)
  paymentInfoVerifiedAt DateTime?
  points                Float     @default(0)
  createdAt             DateTime  @default(now())
}

model Hall {
  id              String   @id @default(uuid())
  name            String
  description     String?
  seatCount       Int`);
fs.writeFileSync('prisma/schema.prisma', c);
