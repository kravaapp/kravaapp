/** Nome do papel do usuário no CT, como exibido no app. */
export const roleLabel = (role: string) =>
  role === "Admin" ? "Administrador" : role === "Aluno" ? "Aluno" : "Professor";
