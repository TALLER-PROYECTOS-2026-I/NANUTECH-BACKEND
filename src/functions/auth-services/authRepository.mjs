// Fallback local provisional para desarrollo y pruebas.
// No reemplaza un origen real de identidades como Cognito.
const initialUsers = [
  {
    email: "test@test.com",
    password: "123456",
    role: "admin",
    attempts: 0,
    locked: false,
    resetCode: null,
  },
  {
    email: "chofer@test.com",
    password: "123456",
    role: "chofer",
    attempts: 0,
    locked: false,
    resetCode: null,
  },
];

let users = initialUsers.map((user) => ({ ...user }));

export const getUserByEmail = async (email) => {
  return users.find((u) => u.email === email);
};

export const incrementAttempts = async (email) => {
  const user = users.find((u) => u.email === email);
  if (user) user.attempts++;
};

export const getAttempts = async (email) => {
  const user = users.find((u) => u.email === email);
  return user?.attempts || 0;
};

export const resetAttempts = async (email) => {
  const user = users.find((u) => u.email === email);
  if (user) user.attempts = 0;
};

export const lockUser = async (email) => {
  const user = users.find((u) => u.email === email);
  if (user) user.locked = true;
};

export const setResetCode = async (email, code) => {
  const user = users.find((u) => u.email === email);
  if (user) user.resetCode = code;
};

export const getResetCode = async (email) => {
  const user = users.find((u) => u.email === email);
  return user?.resetCode || null;
};

export const clearResetCode = async (email) => {
  const user = users.find((u) => u.email === email);
  if (user) user.resetCode = null;
};

export const updatePassword = async (email, newPassword) => {
  const user = users.find((u) => u.email === email);
  if (user) user.password = newPassword;
};

export const resetUsersState = async () => {
  users = initialUsers.map((user) => ({ ...user }));
};
