# Use Node 18 LTS based on Debian Bookworm
FROM node:18-bookworm
WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install all dependencies (including devDependencies)
RUN npm install

# Copy the rest of the application source code and other necessary files
COPY . .

# Build the TypeScript application
RUN npm run build

# Copy the entrypoint script and make it executable
COPY entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

# Set environment variables
ENV DATABASE_PATH=/usr/src/app/data/database.sqlite
ENV PORT=3000
# ENV JWT_SECRET=your_jwt_secret_in_render_env # Set in Render UI

# Expose the port
EXPOSE 3000

# Use the entrypoint script
ENTRYPOINT ["/usr/src/app/entrypoint.sh"]