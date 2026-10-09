using internal_search.Domain.Interfaces.Auth;
using System;
using System.Collections.Generic;
using System.Text;

namespace internal_search_backend.Infraestructure.Security
{
    public class ContrasenaService : IContrasenaRepository
    {
        public bool Verificar(string password, string hash)
        {
            return BCrypt.Net.BCrypt.Verify(password, hash);
        }

        public string Hashear(string password)
        {
            return BCrypt.Net.BCrypt.HashPassword(password, workFactor: 12);
        }
    }
}
