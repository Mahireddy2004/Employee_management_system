# Stage 1: Build & Publish
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copy project file and restore dependencies (optimizes Docker layer caching)
COPY ["EmployeeManagement.Api.csproj", "./"]
RUN dotnet restore "EmployeeManagement.Api.csproj"

# Copy source code and publish in Release mode
COPY . .
RUN dotnet publish "EmployeeManagement.Api.csproj" -c Release -o /app/publish /p:UseAppHost=false

# Stage 2: Runtime
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app

# Expose standard container port
EXPOSE 8080

# Configure ASP.NET Core to bind to 0.0.0.0 and port 8080 by default
ENV ASPNETCORE_URLS=http://+:8080
ENV ASPNETCORE_ENVIRONMENT=Production

COPY --from=build /app/publish .

ENTRYPOINT ["dotnet", "EmployeeManagement.Api.dll"]
