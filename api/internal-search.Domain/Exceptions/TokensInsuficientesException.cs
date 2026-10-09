namespace internal_search.Domain.Exceptions
{
    public class TokensInsuficientesException : Exception
    {
        public int Saldo { get; }
        public int Costo { get; }

        public TokensInsuficientesException(int saldo, int costo)
            : base("No tienes tokens suficientes para esta consulta.")
        {
            Saldo = saldo;
            Costo = costo;
        }
    }
}
